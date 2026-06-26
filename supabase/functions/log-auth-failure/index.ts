import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

// Registra intentos fallidos de inicio de sesión para análisis interno
// y detección de abuso. Solo lectura desde el cliente para administradores
// (ver RLS); escritura siempre vía service role aquí.
const BodySchema = z.object({
  email: z.string().trim().min(1).max(255).email(),
  reason: z.enum([
    'invalid_credentials',
    'invalid_input',
    'rate_limited',
    'unknown_error',
  ]),
});

// In-memory rate limit per instance to evitar inundación.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const bucket = new Map<string, { count: number; reset: number }>();

function rateLimit(key: string) {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || entry.reset < now) {
    bucket.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    null;
  const userAgent = req.headers.get('user-agent')?.slice(0, 300) ?? null;

  if (!rateLimit(ip ?? 'unknown')) {
    // No revelar detalles internos al cliente.
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });

  const { error } = await admin.from('auth_failed_attempts').insert({
    email: parsed.data.email.toLowerCase(),
    reason: parsed.data.reason,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    console.error('[log-auth-failure] insert error', error.message);
  }

  // Respuesta siempre genérica para no filtrar información.
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});