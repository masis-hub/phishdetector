import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple in-memory rate limit (per cold start) to deter abuse.
const rateLimit = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

const TO_EMAIL = "info@techsecureai.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const now = Date.now();
    const entry = rateLimit.get(ip);
    if (entry && entry.reset > now) {
      if (entry.count >= MAX_REQUESTS) {
        return new Response(JSON.stringify({ error: "RATE_LIMITED" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      entry.count += 1;
    } else {
      rateLimit.set(ip, { count: 1, reset: now + WINDOW_MS });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "INVALID_BODY" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const company = String(body.company ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const message = String(body.message ?? "").trim();
    // Honeypot — bots fill hidden fields, humans don't.
    const honeypot = String(body.website ?? "").trim();

    if (honeypot) {
      // Pretend success so the bot doesn't retry.
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!name || name.length > 120) {
      return new Response(JSON.stringify({ error: "INVALID_NAME" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email) || email.length > 200) {
      return new Response(JSON.stringify({ error: "INVALID_EMAIL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (company.length > 200 || phone.length > 60 || message.length > 2000) {
      return new Response(JSON.stringify({ error: "FIELD_TOO_LONG" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const requestId = crypto.randomUUID();

    // 1) Internal notification to the team
    const notif = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "demo-notification",
        recipientEmail: TO_EMAIL,
        idempotencyKey: `demo-notif-${requestId}`,
        templateData: { name, email, company, phone, message, ip },
      },
    });
    if (notif.error) {
      console.error("notification send failed", notif.error);
      return new Response(JSON.stringify({ error: "SEND_FAILED" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Confirmation to the requester (best-effort)
    const conf = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "demo-confirmation",
        recipientEmail: email,
        idempotencyKey: `demo-conf-${requestId}`,
        templateData: { name, company },
      },
    });
    if (conf.error) {
      console.error("confirmation send failed (non-fatal)", conf.error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-demo unexpected error", err);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});