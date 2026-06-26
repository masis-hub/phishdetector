import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkDomainDnsReady } from "../_shared/dns-readiness.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default verified sending domain delegated to Lovable Emails. The visible
// "display name" still mimics the spoofed brand, which is what makes the
// simulation realistic without violating provider policy.
const DEFAULT_SENDER_DOMAIN = "notify.techsecureai.com";
const DEFAULT_SENDER_LOCAL = "simulations";

function generateUnsubToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getOrCreateUnsubscribeToken(supabase: any, email: string): Promise<string | null> {
  const normalized = email.toLowerCase();
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing && !existing.used_at) return existing.token;
  if (!existing) {
    const token = generateUnsubToken();
    await supabase
      .from("email_unsubscribe_tokens")
      .upsert({ token, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
    const { data: stored } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalized)
      .maybeSingle();
    return stored?.token ?? token;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { campaign_id, resend: isResend, target_id, locale: rawLocale } = await req.json();
    if (!campaign_id || typeof campaign_id !== "string") {
      throw new Error("INVALID_INPUT");
    }
    const locale: "es" | "en" = rawLocale === "en" ? "en" : "es";
    // Validate campaign_id is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaign_id)) {
      throw new Error("INVALID_INPUT");
    }
    if (target_id && !uuidRegex.test(target_id)) {
      throw new Error("INVALID_INPUT");
    }

    // Authorization: caller must be a writer in the campaign's organization
    // (or a global admin). Resolve the campaign org first.
    const { data: campaignOrgRow, error: campaignOrgErr } = await supabase
      .from("campaigns")
      .select("organization_id")
      .eq("id", campaign_id)
      .maybeSingle();
    if (campaignOrgErr || !campaignOrgRow) throw new Error("CAMPAIGN_NOT_FOUND");
    const { data: isWriter } = await supabase.rpc("is_org_writer", {
      _user_id: userId,
      _org_id: campaignOrgRow.organization_id,
    });
    const { data: isGlobalAdmin } = await supabase.rpc("is_global_admin", { _user_id: userId });
    if (isWriter !== true && isGlobalAdmin !== true) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_PERMISSIONS" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign with template and organization (for sender domain resolution)
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, phishing_templates(*), organizations(sender_domain_id)")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) throw new Error("CAMPAIGN_NOT_FOUND");
    if (!campaign.template_id) throw new Error("TEMPLATE_NOT_ASSIGNED");

    const template = campaign.phishing_templates;
    if (!template) throw new Error("TEMPLATE_NOT_FOUND");

    // Resolve sender domain: campaign override → org default → global default
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

    // Block launch if the resolved sender domain doesn't have SPF/DKIM/DMARC
    // all verified in Resend. Platform-managed default domain is exempt.
    const dnsCheck = await checkDomainDnsReady(senderDomain);
    if (!dnsCheck.ready) {
      console.warn("Campaign launch blocked: DNS not ready", {
        campaign_id, senderDomain, missing: dnsCheck.missing, reason: dnsCheck.reason,
      });
      return new Response(
        JSON.stringify({
          error: "DOMAIN_NOT_VERIFIED",
          domain: senderDomain,
          missing: dnsCheck.missing,
          reason: dnsCheck.reason,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick localized content (fallback to ES when EN missing)
    const useEn = locale === "en" && !!(template.html_content_en && template.subject_en);
    const tplSubject: string = useEn ? template.subject_en : template.subject;
    const tplHtml: string = useEn ? template.html_content_en : template.html_content;
    const tplSenderName: string = useEn && template.sender_name_en
      ? template.sender_name_en
      : template.sender_name;

    // Note: template.sender_email is intentionally a spoofed brand domain used
    // only as the visible "From label" context. We always send from our verified
    // domain to comply with Resend/DMARC. The display name still mirrors the
    // template so the simulation is realistic in the recipient's inbox.

    // Fetch targets
    let targetsQuery = supabase
      .from("campaign_targets")
      .select("*")
      .eq("campaign_id", campaign_id);

    if (target_id) {
      // Single target resend
      targetsQuery = targetsQuery.eq("id", target_id);
    } else if (!isResend) {
      targetsQuery = targetsQuery.is("sent_at", null);
    }

    const { data: targets, error: targetsError } = await targetsQuery;

    if (targetsError) throw new Error("FETCH_TARGETS_FAILED");
    if (!targets || targets.length === 0) throw new Error("NO_TARGETS");

    const trackingBaseUrl = `${supabaseUrl}/functions/v1/track-click`;
    let sentCount = 0;
    const errors: string[] = [];

    for (const target of targets) {
      try {
        const trackingUrl = `${trackingBaseUrl}?token=${encodeURIComponent(target.unique_token)}`;

        // Sanitize template variables to prevent injection
        const safeName = (target.full_name || "").replace(/[<>"'&]/g, "");
        const safeEmail = target.email.replace(/[<>"'&]/g, "");
        const safeDept = (target.department || "").replace(/[<>"'&]/g, "");

        const personalizedHtml = tplHtml
          .replace(/\{tracking_link\}/g, trackingUrl)
          .replace(/\{name\}/g, safeName)
          .replace(/\{email\}/g, safeEmail)
          .replace(/\{department\}/g, safeDept);

        const safeFromName = tplSenderName.replace(/[<>"\r\n]/g, "").slice(0, 120);
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
            subject: tplSubject,
            html: personalizedHtml,
            text: personalizedText || tplSubject,
            purpose: "transactional",
            label: `campaign:${campaign_id}`,
            idempotency_key: `${campaign_id}:${target.id}:${messageId}`,
            queued_at: new Date().toISOString(),
            unsubscribe_token: await getOrCreateUnsubscribeToken(supabase, target.email),
          },
        });

        if (enqueueError) {
          console.error("Failed to enqueue campaign email", {
            targetId: target.id,
            recipient: target.email,
            error: enqueueError,
          });
          throw new Error("ENQUEUE_FAILED");
        }

        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: `campaign:${campaign_id}`,
          recipient_email: target.email,
          status: "pending",
        });

        console.log("Campaign email enqueued", {
          targetId: target.id,
          recipient: target.email,
          messageId,
        });

        const { error: updateError } = await supabase
          .from("campaign_targets")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", target.id);

        if (updateError) {
          throw new Error("DB_UPDATE_FAILED");
        }

        sentCount++;
      } catch (err: any) {
        console.error("Target email send failed", {
          targetId: target.id,
          recipient: target.email,
          error: err?.message || String(err),
        });
        errors.push(err?.message || "UNEXPECTED");
      }
    }

    if (sentCount > 0) {
      await supabase
        .from("campaigns")
        .update({ status: "active", started_at: campaign.started_at || new Date().toISOString() })
        .eq("id", campaign_id);
    }

    const responseBody = { sent: sentCount, total: targets.length, errors };

    if (sentCount === 0) {
      return new Response(
        JSON.stringify({
          ...responseBody,
          error: errors[0] || "PROVIDER_REJECTED",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-campaign-emails:", error);
    const code = typeof error?.message === "string" ? error.message : "CAMPAIGN_PROCESS_FAILED";
    const knownCodes = new Set([
      "INVALID_INPUT", "CAMPAIGN_NOT_FOUND", "TEMPLATE_NOT_ASSIGNED", "TEMPLATE_NOT_FOUND",
      "INVALID_SENDER_DOMAIN", "FETCH_TARGETS_FAILED", "NO_TARGETS", "DOMAIN_NOT_VERIFIED",
    ]);
    const status = knownCodes.has(code) ? 400 : 500;
    return new Response(JSON.stringify({ error: knownCodes.has(code) ? code : "CAMPAIGN_PROCESS_FAILED" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
