import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

serve(async (req) => {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response("Too many requests", { status: 429 });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token || !/^[a-zA-Z0-9_-]{20,128}$/.test(token)) {
      return new Response("Not found", { status: 404 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: target, error } = await supabase
      .from("campaign_targets")
      .select("id, reported_at")
      .eq("unique_token", token)
      .single();

    if (error || !target) {
      return new Response("Not found", { status: 404 });
    }

    if (!target.reported_at) {
      await supabase
        .from("campaign_targets")
        .update({ reported_at: new Date().toISOString() })
        .eq("id", target.id);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Great Job!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0fdf4; color: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 640px; padding: 48px 32px; text-align: center; }
    .icon { width: 80px; height: 80px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px; }
    h1 { font-size: 28px; margin-bottom: 16px; color: #166534; }
    p { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🎉</div>
    <h1>Excellent Work!</h1>
    <p>You correctly identified this email as a phishing simulation. Your report has been recorded.</p>
    <p>Your vigilance helps keep our organization safe. Continue to stay alert and report any suspicious emails you receive.</p>
    <p>You can now close this page.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
