import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Simple in-memory rate limiter (per isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

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
    // Rate limiting by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response("Too many requests", { status: 429 });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // Strict token validation: UUID-safe characters, fixed length range
    if (!token || !/^[a-zA-Z0-9_-]{20,128}$/.test(token)) {
      // Return generic 404 to prevent token enumeration
      return new Response("Not found", { status: 404 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: target, error } = await supabase
      .from("campaign_targets")
      .select("id, campaign_id, clicked_at")
      .eq("unique_token", token)
      .single();

    if (error || !target) {
      // Generic response to prevent enumeration
      return new Response("Not found", { status: 404 });
    }

    // Only record first click
    if (!target.clicked_at) {
      await supabase
        .from("campaign_targets")
        .update({ clicked_at: new Date().toISOString() })
        .eq("id", target.id);
    }

    const reportUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/report-phish?token=${encodeURIComponent(token)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Awareness Training</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 640px; padding: 48px 32px; text-align: center; }
    .icon { width: 80px; height: 80px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px; }
    h1 { font-size: 28px; margin-bottom: 16px; color: #0f172a; }
    p { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
    .tips { text-align: left; background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .tips h2 { font-size: 18px; margin-bottom: 12px; }
    .tips ul { padding-left: 20px; }
    .tips li { margin-bottom: 8px; color: #475569; }
    .report-btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .report-btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>This Was a Phishing Simulation</h1>
    <p>Don't worry — this was a security awareness exercise conducted by your organization. No harm has been done, but this is a learning opportunity.</p>
    <p>The email you received was designed to test your ability to identify phishing attempts. By clicking the link, you've helped us understand where we can improve our security training.</p>
    
    <div class="tips">
      <h2>🛡️ How to Spot Phishing Emails</h2>
      <ul>
        <li><strong>Check the sender</strong> — Does the email address match the claimed organization?</li>
        <li><strong>Look for urgency</strong> — Phishing often creates artificial time pressure</li>
        <li><strong>Hover over links</strong> — Check where links actually go before clicking</li>
        <li><strong>Watch for errors</strong> — Typos and formatting issues are red flags</li>
        <li><strong>Verify requests</strong> — Contact the sender through known channels</li>
        <li><strong>Report suspicious emails</strong> — Use your organization's reporting tools</li>
      </ul>
    </div>
    
    <p>If you recognized this as a phishing attempt, you can report it for credit:</p>
    <a class="report-btn" href="${reportUrl}">I Identified This as Phishing</a>
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
