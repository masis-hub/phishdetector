import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

// Invita un usuario por correo y le asigna un rol dentro de una organización
// (o un rol global de admin). Solo administradores globales pueden invocarla.

const BodySchema = z
  .object({
    email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()),
    full_name: z.string().trim().max(120).optional(),
    role: z.enum(['admin', 'manager', 'viewer']),
    organization_id: z.string().uuid().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === 'admin' && val.organization_id) {
      ctx.addIssue({ code: 'custom', path: ['organization_id'], message: 'Admin global no debe tener organización' });
    }
    if (val.role !== 'admin' && !val.organization_id) {
      ctx.addIssue({ code: 'custom', path: ['organization_id'], message: 'Manager y viewer requieren organización' });
    }
  });

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const bucket = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string) {
  const now = Date.now();
  const e = bucket.get(key);
  if (!e || e.reset < now) { bucket.set(key, { count: 1, reset: now + RATE_WINDOW_MS }); return true; }
  if (e.count >= RATE_MAX) return false;
  e.count += 1; return true;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') || 'unknown';
  if (!rateLimit(ip)) return json({ ok: false, error: 'Demasiadas solicitudes' }, 429);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, error: 'No autorizado' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify caller identity
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ ok: false, error: 'No autorizado' }, 401);
  const callerId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  // Parse body
  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ ok: false, error: 'Solicitud inválida' }, 400); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 400);
  }
  const { email, full_name, role, organization_id } = parsed.data;

  // Authorize: global admin OR org writer (admin/manager) of the target org
  const { data: isAdmin } = await admin.rpc('is_global_admin', { _user_id: callerId });
  let authorized = !!isAdmin;
  if (!authorized && organization_id) {
    const { data: isWriter } = await admin.rpc('is_org_writer', { _user_id: callerId, _org_id: organization_id });
    authorized = !!isWriter;
  }
  if (!authorized) return json({ ok: false, error: 'Acceso restringido' }, 403);

  // Org members cap: max 3 distinct users per organization (1 lead + 2 adicionales)
  if (organization_id) {
    const { data: members, error: memErr } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('organization_id', organization_id);
    if (memErr) {
      console.error('[admin-invite-user] members count', memErr.message);
      return json({ ok: false, error: 'Error al validar cupo' }, 500);
    }
    const distinct = new Set((members ?? []).map((m: any) => m.user_id));
    // We will check again after we know userId, but short-circuit if already at cap
    // when caller is not adding to themselves.
    if (distinct.size >= 3) {
      // Allow only if the invited email already belongs to one of those users (role change)
      const { data: list0 } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing0 = list0?.users.find((u) => u.email?.toLowerCase() === email);
      if (!existing0 || !distinct.has(existing0.id)) {
        return json({ ok: false, error: 'Esta organización ya alcanzó el máximo de 3 usuarios (1 administrador + 2 adicionales).' }, 409);
      }
    }
  }

  // 1. Find existing auth user
  let userId: string | null = null;
  let invited = false;
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    console.error('[admin-invite-user] listUsers', listErr.message);
    return json({ ok: false, error: 'Error al consultar usuarios' }, 500);
  }
  const existing = list.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    userId = existing.id;
  } else {
    // Invite the user (sends email)
    const redirectTo = `${new URL(req.url).origin.replace(/\/functions\/v1\/.*/, '')}`;
    const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: full_name ? { full_name } : undefined,
      redirectTo: `${redirectTo}/reset-password`,
    });
    if (inviteErr || !invite?.user) {
      console.error('[admin-invite-user] invite', inviteErr?.message);
      return json({ ok: false, error: 'No se pudo enviar la invitación' }, 500);
    }
    userId = invite.user.id;
    invited = true;
  }

  // 2. Ensure profile (handle_new_user creates one on signup; fallback upsert here)
  await admin.from('profiles').upsert({
    id: userId!,
    email,
    full_name: full_name ?? email,
  }, { onConflict: 'id' });

  // 3. Upsert role
  const { error: roleInsertErr } = await admin
    .from('user_roles')
    .upsert(
      { user_id: userId!, role, organization_id: organization_id ?? null },
      { onConflict: role === 'admin' && !organization_id ? 'user_id,role' : 'user_id,role,organization_id', ignoreDuplicates: true },
    );
  if (roleInsertErr) {
    // Fallback: ignore unique violations silently
    if (!/duplicate key/i.test(roleInsertErr.message)) {
      console.error('[admin-invite-user] role upsert', roleInsertErr.message);
      return json({ ok: false, error: 'No se pudo asignar el rol' }, 500);
    }
  }

  return json({ ok: true, user_id: userId, invited });
});