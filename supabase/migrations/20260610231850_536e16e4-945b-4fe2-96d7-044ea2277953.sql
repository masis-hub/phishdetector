
-- 1. Add organization scope to user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Drop old unique (user_id, role) if present, replace with partial uniques
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- A user can only have a given role once per org, and once globally
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_org_uidx
  ON public.user_roles (user_id, role, organization_id)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_global_uidx
  ON public.user_roles (user_id, role)
  WHERE organization_id IS NULL;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND organization_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _role app_role, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_global_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND organization_id = _org_id
    );
$$;

-- 3. Tighten RLS on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

CREATE POLICY "Only global admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_global_admin(auth.uid()));

CREATE POLICY "Only global admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

CREATE POLICY "Only global admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- 4. Allow global admins to read all profiles (for the admin panel)
DROP POLICY IF EXISTS "Global admins can view all profiles" ON public.profiles;
CREATE POLICY "Global admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_global_admin(auth.uid()));
