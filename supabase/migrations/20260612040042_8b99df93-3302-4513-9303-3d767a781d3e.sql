
-- 1. Drop overly-permissive duplicate policies on mitigation_plans
DROP POLICY IF EXISTS "Members can delete org plans" ON public.mitigation_plans;
DROP POLICY IF EXISTS "Members can insert org plans" ON public.mitigation_plans;
DROP POLICY IF EXISTS "Members can update org plans" ON public.mitigation_plans;

-- 2. Drop overly-permissive update policy on organizations
DROP POLICY IF EXISTS "Members can update their organizations" ON public.organizations;

-- 3. Allow org members to view co-workers' profiles
CREATE POLICY "Org members can view co-worker profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles me
    JOIN public.user_roles other ON other.organization_id = me.organization_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = profiles.id
      AND me.organization_id IS NOT NULL
  )
);

-- 4. Revoke anon EXECUTE on SECURITY DEFINER RLS helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, app_role, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_global_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_writer(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_campaign_target_org() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, app_role, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_global_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_writer(uuid, uuid) TO authenticated, service_role;
