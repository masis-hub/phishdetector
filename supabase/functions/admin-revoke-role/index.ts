import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({ role_id: z.string().uuid() });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, error: 'No autorizado' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
  if (cErr || !claims?.claims?.sub) return json({ ok: false, error: 'No autorizado' }, 401);
  const callerId = claims.claims.sub as string;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc('is_global_admin', { _user_id: callerId });
  if (!isAdmin) return json({ ok: false, error: 'Acceso restringido' }, 403);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ ok: false }, 400); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ ok: false }, 400);

  // Prevent removing the last global admin
  const { data: target } = await admin
    .from('user_roles')
    .select('id, role, organization_id, user_id')
    .eq('id', parsed.data.role_id)
    .maybeSingle();
  if (!target) return json({ ok: false, error: 'No encontrado' }, 404);

  if (target.role === 'admin' && !target.organization_id) {
    const { count } = await admin
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .is('organization_id', null);
    if ((count ?? 0) <= 1) return json({ ok: false, error: 'No puedes eliminar al último administrador global' }, 400);
  }

  const { error } = await admin.from('user_roles').delete().eq('id', parsed.data.role_id);
  if (error) {
    console.error('[admin-revoke-role] delete', error.message);
    return json({ ok: false, error: 'No se pudo revocar' }, 500);
  }
  return json({ ok: true });
});