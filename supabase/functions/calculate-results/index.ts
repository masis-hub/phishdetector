import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = (claimsData.claims as any).sub;

    const { campaign_id } = await req.json();
    if (!campaign_id || typeof campaign_id !== "string") {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaign_id)) {
      return new Response(JSON.stringify({ error: "Invalid campaign_id format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve campaign org and ensure the caller is a writer in that org.
    const { data: campaignRow, error: campaignErr } = await supabase
      .from("campaigns")
      .select("id, organization_id")
      .eq("id", campaign_id)
      .maybeSingle();
    if (campaignErr || !campaignRow) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isWriter, error: writerErr } = await supabase.rpc("is_org_writer", {
      _user_id: userId,
      _org_id: campaignRow.organization_id,
    });
    const { data: isGlobalAdmin } = await supabase.rpc("is_global_admin", { _user_id: userId });
    if (writerErr || (isWriter !== true && isGlobalAdmin !== true)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all targets for this campaign
    const { data: targets, error: targetsError } = await supabase
      .from("campaign_targets")
      .select("*")
      .eq("campaign_id", campaign_id);

    if (targetsError) throw new Error("Failed to fetch targets");

    const totalTargets = targets?.length || 0;
    const emailsSent = targets?.filter((t) => t.sent_at).length || 0;
    const emailsClicked = targets?.filter((t) => t.clicked_at).length || 0;
    const emailsReported = targets?.filter((t) => t.reported_at).length || 0;
    const clickRate = emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;
    const reportRate = emailsSent > 0 ? (emailsReported / emailsSent) * 100 : 0;

    // Upsert results
    const { error: upsertError } = await supabase
      .from("campaign_results")
      .upsert(
        {
          campaign_id,
          total_targets: totalTargets,
          emails_sent: emailsSent,
          emails_clicked: emailsClicked,
          emails_reported: emailsReported,
          click_rate: clickRate,
          report_rate: reportRate,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: "campaign_id" }
      );

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        total_targets: totalTargets,
        emails_sent: emailsSent,
        emails_clicked: emailsClicked,
        emails_reported: emailsReported,
        click_rate: clickRate,
        report_rate: reportRate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in calculate-results:", error);
    return new Response(JSON.stringify({ error: "Failed to calculate results" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
