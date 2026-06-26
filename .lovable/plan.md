
# Roles por organización y panel de administración

Vamos a habilitar el modelo de proveedor de servicios real: roles ligados a cada organización (empresa cliente) y un panel para que el admin global cree usuarios e invite por correo asignándoles un rol dentro de una empresa específica.

## Modelo de datos (migración)

1. Añadir `organization_id UUID` (nullable) a `public.user_roles` con FK a `public.organizations(id) ON DELETE CASCADE`.
   - `NULL` = rol global (reservado para `admin` de TechSecure AI).
   - Índice único parcial: un usuario solo puede tener un mismo rol una vez por organización.
2. Nueva función `public.has_org_role(_user_id uuid, _role app_role, _org_id uuid)` (SECURITY DEFINER, STABLE) que devuelve true si:
   - El usuario tiene ese rol en esa organización, **o**
   - El usuario tiene rol `admin` global (`organization_id IS NULL`).
3. Función `public.is_global_admin(_user_id uuid)` para usar en RLS de `user_roles`, `organizations`, y el panel.
4. Backfill: cualquier registro existente queda como rol global (sin tocar `admin` actual).
5. RLS de `user_roles`: solo `is_global_admin(auth.uid())` puede `INSERT/UPDATE/DELETE`; los usuarios pueden leer sus propias filas.

Las policies de campañas/contactos siguen funcionando porque `has_role` no cambia su firma; queda igual para compatibilidad. Más adelante se podrán endurecer por organización tabla por tabla — fuera de alcance ahora.

## Backend — Edge function `admin-invite-user`

Endpoint protegido (`verify_jwt = false`, validado en código con `getClaims`):

- Verifica que el solicitante es `admin` global (`is_global_admin`).
- Valida payload con Zod: `{ email, full_name?, role: 'admin'|'manager'|'viewer', organization_id?: uuid }`.
  - `admin` requiere `organization_id` nulo. `manager`/`viewer` requieren `organization_id`.
- Usa service role para:
  1. Buscar el usuario en `auth.users` por email; si no existe, llama a `admin.inviteUserByEmail` (con `redirectTo` a `/reset-password`).
  2. `upsert` en `user_roles` con `(user_id, role, organization_id)`.
- Devuelve `{ ok, user_id, invited: boolean }`. Errores genéricos al cliente.
- Rate-limit en memoria (10 req/min por IP) y log a `auth_failed_attempts` cuando la validación falla con razón `invalid_input`.

Segunda edge function `admin-revoke-role` para borrar una asignación específica.

## Frontend — Panel `/admin/access`

Nueva página `src/pages/AdminAccess.tsx`, accesible solo si `has_role(uid,'admin')` (guard en el route loader y en `DashboardLayout`). Aparece en el menú lateral como "Accesos y roles" únicamente para admins.

Estructura:
- **Tarjeta de cabecera** con métricas: usuarios totales, admins globales, organizaciones, accesos pendientes (invitados sin confirmar).
- **Selector de organización** (dropdown con todas las orgs + opción "TechSecure AI / global").
- **Tabla de miembros** de esa organización (nombre, email, rol, fecha de alta, último ingreso si está disponible).
  - Acciones por fila: cambiar rol (`manager` ↔ `viewer`), revocar acceso.
- **Botón "Invitar usuario"** → diálogo con email, nombre, rol (radio), organización (preseleccionada).
- **Sección "Administradores globales"** separada, solo visible para el admin actual.

Estilo consistente con el resto del panel (glassmorphism, paleta TechSecure AI, textos en español).

## Prueba end-to-end del login

Después de desplegar, voy a ejecutar manualmente vía el browser del preview:
1. `/auth` con credenciales válidas → redirige a `/dashboard`.
2. `/auth` con email mal formado → mensaje inline.
3. `/auth` con contraseña incorrecta → mensaje genérico + entrada en `auth_failed_attempts` (verifico con `read_query`).
4. "¿Olvidaste tu contraseña?" → confirma envío sin revelar si el correo existe.
5. Invitar un usuario nuevo desde `/admin/access` → comprobar que recibe rol con la organización correcta y aparece en la tabla.

Te paso el resumen con capturas y resultados.

## Archivos afectados

- Migración SQL nueva (estructura + funciones + RLS).
- `supabase/functions/admin-invite-user/index.ts` (nuevo).
- `supabase/functions/admin-revoke-role/index.ts` (nuevo).
- `src/pages/AdminAccess.tsx` (nuevo) + componentes en `src/components/admin/`.
- `src/components/layout/DashboardLayout.tsx` (entrada de menú condicional).
- `src/App.tsx` (ruta `/admin/access` con guard).
- `src/hooks/useIsAdmin.ts` (nuevo helper) para los guards de UI.

## Fuera de alcance (siguiente iteración si lo necesitas)

- Endurecer RLS de `campaigns`, `contacts`, `mitigation_plans` por `organization_id` (gran cambio, ahora siguen siendo visibles globalmente para admin/manager).
- Auditoría completa de cambios de roles.
- UI para que un `manager` gestione su propio equipo.
