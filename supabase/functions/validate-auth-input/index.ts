import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

// Backend validation for auth inputs. Returns stable error CODES so the
// UI can translate them via i18n without the backend embedding copy in
// any specific language.
const BaseSchema = z.object({
  mode: z.enum(['login', 'forgot']),
  email: z
    .string()
    .trim()
    .min(1, 'EMAIL_REQUIRED')
    .max(255, 'EMAIL_TOO_LONG')
    .email('INVALID_EMAIL'),
  password: z
    .string()
    .min(8, 'PASSWORD_TOO_SHORT')
    .max(100, 'PASSWORD_TOO_LONG')
    .optional(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ ok: false, code: 'INVALID_INPUT' }, 400);
  }

  const parsed = BaseSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return jsonResponse(
      {
        ok: false,
        // Field-scoped error codes. UI maps each one through i18n.
        codes: {
          email: fieldErrors.email?.[0],
          password: fieldErrors.password?.[0],
        },
      },
      400,
    );
  }

  const { mode, password } = parsed.data;

  if (mode === 'login' && (!password || password.length === 0)) {
    return jsonResponse(
      { ok: false, codes: { password: 'PASSWORD_REQUIRED' } },
      400,
    );
  }

  return jsonResponse({ ok: true });
});