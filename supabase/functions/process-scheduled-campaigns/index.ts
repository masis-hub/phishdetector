import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkDomainDnsReady } from "../_shared/dns-readiness.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DEFAULT_SENDER_DOMAIN = "notify.phishdetector.app";
const DEFAULT_SENDER_LOCAL = "simulations";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Restrict access: accept either the shared CRON_SECRET header OR a valid
  // service_role bearer token (used by the pg_cron job from vault).
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const hasValidSecret = !!expectedSecret && providedSecret === expectedSecret;
  const hasValidServiceRole =
    !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;
  if (!hasValidSecret && !hasValidServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const nowIso = new Date().toISOString();

    // Find draft campaigns whose scheduled_at has arrived
    const { data: campaigns, error: campErr } = await supabase
      .from("campaigns")
      .select("*, phishing_templates(*), organizations(sender_domain_id)")
      .eq("status", "draft")
      .not("template_id", "is", null)
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", nowIso);

    if (campErr) throw campErr;

    const results: any[] = [];
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/track-click`;

    for (const campaign of campaigns || []) {
      const template = (campaign as any).phishing_templates;
      if (!template) continue;

      // Resolve sender domain: campaign → org → default
      const orgSenderDomainId = (campaign as any).organizations?.sender_domain_id ?? null;
      const resolvedSenderDomainId = (campaign as any).sender_domain_id ?? orgSenderDomainId;
      let senderDomain = DEFAULT_SENDER_DOMAIN;
      let senderLocal = DEFAULT_SENDER_LOCAL;
      if (resolvedSenderDomainId) {
        const { data: sd } = await supabase
          .from("sender_domains")
          .select("domain, default_local_part, is_active")
          .eq("id", resolvedSenderDomainId)
          .maybeSingle();
        if (sd && sd.is_active) {
          senderDomain = sd.domain;
          senderLocal = sd.default_local_part || DEFAULT_SENDER_LOCAL;
        }
      }
      const SIMULATION_FROM_ADDRESS = `${senderLocal}@${senderDomain}`;

      // DNS readiness gate — skip campaign if SPF/DKIM/DMARC not all verified
      const dnsCheck = await checkDomainDnsReady(senderDomain);
      if (!dnsCheck.ready) {
        console.warn(`Skipping scheduled campaign ${campaign.id}: domain ${senderDomain} not verified`, {
          missing: dnsCheck.missing, reason: dnsCheck.reason,
        });
        results.push({
          campaign_id: campaign.id,
          skipped: true,
          reason: "DOMAIN_NOT_VERIFIED",
          domain: senderDomain,
          missing: dnsCheck.missing,
        });
        continue;
      }

      const { data: targets } = await supabase
        .from("campaign_targets")
        .select("*")
        .eq("campaign_id", campaign.id)
        .is("sent_at", null);

      if (!targets || targets.length === 0) {
        console.log(`No pending targets for campaign ${campaign.id}`);
        continue;
      }

      let sentCount = 0;
      for (const target of targets) {
        try {
          const trackingUrl = `${trackingBaseUrl}?token=${encodeURIComponent(target.unique_token)}`;
          const safeName = (target.full_name || "").replace(/[<>"'&]/g, "");
          const safeEmail = target.email.replace(/[<>"'&]/g, "");
          const safeDept = (target.department || "").replace(/[<>"'&]/g, "");

          const personalizedHtml = template.html_content
            .replace(/\{tracking_link\}/g, trackingUrl)
            .replace(/\{name\}/g, safeName)
            .replace(/\{email\}/g, safeEmail)
            .replace(/\{department\}/g, safeDept);

          const safeFromName = String(template.sender_name || "")
            .replace(/[<>"\r\n]/g, "")
            .slice(0, 120);
          const messageId = crypto.randomUUID();
          const personalizedText = personalizedHtml
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<br\s*\/?>(\s*)/gi, "\n")
            .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
          const { error: enqueueError } = await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: messageId,
              to: target.email,
              from: `${safeFromName} <${SIMULATION_FROM_ADDRESS}>`,
              sender_domain: senderDomain,
              subject: template.subject,
              html: personalizedHtml,
              text: personalizedText || template.subject,
              purpose: "transactional",
              label: `campaign:${campaign.id}`,
              idempotency_key: `${campaign.id}:${target.id}:${messageId}`,
              queued_at: new Date().toISOString(),
            },
          });
          if (enqueueError) {
            throw new Error(`ENQUEUE_FAILED: ${enqueueError.message || enqueueError}`);
          }
          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: `campaign:${campaign.id}`,
            recipient_email: target.email,
            status: "pending",
          });

          await supabase
            .from("campaign_targets")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", target.id);

          sentCount++;
        } catch (err: any) {
          console.error(`Failed sending to ${target.email}:`, err?.message || err);
        }
      }

      if (sentCount > 0) {
        await supabase
          .from("campaigns")
          .update({ status: "active", started_at: campaign.started_at || new Date().toISOString() })
          .eq("id", campaign.id);
      }

      results.push({ campaign_id: campaign.id, sent: sentCount, total: targets.length });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("process-scheduled-campaigns error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
