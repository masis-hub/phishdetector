
-- Helper: returns true if user is admin or manager of the given org (or global admin)
CREATE OR REPLACE FUNCTION public.is_org_writer(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _org_id IS NOT NULL AND (
    public.is_global_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND organization_id = _org_id
        AND role IN ('admin','manager')
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_writer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_writer(uuid, uuid) TO authenticated, service_role;

-- ============ campaigns ============
DROP POLICY IF EXISTS "Members can insert org campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can update org campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can delete org campaigns" ON public.campaigns;

CREATE POLICY "Admins/managers can insert org campaigns"
ON public.campaigns FOR INSERT TO authenticated
WITH CHECK (public.is_org_writer(auth.uid(), organization_id));

CREATE POLICY "Admins/managers can update org campaigns"
ON public.campaigns FOR UPDATE TO authenticated
USING (public.is_org_writer(auth.uid(), organization_id))
WITH CHECK (public.is_org_writer(auth.uid(), organization_id));

CREATE POLICY "Admins/managers can delete org campaigns"
ON public.campaigns FOR DELETE TO authenticated
USING (public.is_org_writer(auth.uid(), organization_id));

-- ============ contacts ============
DROP POLICY IF EXISTS "Members can insert org contacts" ON public.contacts;
DROP POLICY IF EXISTS "Members can update org contacts" ON public.contacts;
DROP POLICY IF EXISTS "Members can delete org contacts" ON public.contacts;

CREATE POLICY "Admins/managers can insert org contacts"
ON public.contacts FOR INSERT TO authenticated
WITH CHECK (public.is_org_writer(auth.uid(), organization_id));

CREATE POLICY "Admins/managers can update org contacts"
ON public.contacts FOR UPDATE TO authenticated
USING (public.is_org_writer(auth.uid(), organization_id))
WITH CHECK (public.is_org_writer(auth.uid(), organization_id));

CREATE POLICY "Admins/managers can delete org contacts"
ON public.contacts FOR DELETE TO authenticated
USING (public.is_org_writer(auth.uid(), organization_id));

-- ============ mitigation_plans ============
DROP POLICY IF EXISTS "Members can insert org mitigation plans" ON public.mitigation_plans;
DROP POLICY IF EXISTS "Members can update org mitigation plans" ON public.mitigation_plans;
DROP POLICY IF EXISTS "Members can delete org mitigation plans" ON public.mitigation_plans;

CREATE POLICY "Admins/managers can insert org mitigation plans"
ON public.mitigation_plans FOR INSERT TO authenticated
WITH CHECK (public.is_org_writer(auth.uid(), organization_id));

CREATE POLICY "Admins/managers can update org mitigation plans"
ON public.mitigation_plans FOR UPDATE TO authenticated
USING (public.is_org_writer(auth.uid(), organization_id))
WITH CHECK (public.is_org_writer(auth.uid(), organization_id));

CREATE POLICY "Admins/managers can delete org mitigation plans"
ON public.mitigation_plans FOR DELETE TO authenticated
USING (public.is_org_writer(auth.uid(), organization_id));

-- ============ organizations (UPDATE only — INSERT/DELETE already global-admin) ============
DROP POLICY IF EXISTS "Members can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Org members can update organization" ON public.organizations;

CREATE POLICY "Admins/managers can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_org_writer(auth.uid(), id))
WITH CHECK (public.is_org_writer(auth.uid(), id));

-- ============ phishing_templates ============
DROP POLICY IF EXISTS "Members can insert org templates" ON public.phishing_templates;
DROP POLICY IF EXISTS "Members can update org templates" ON public.phishing_templates;
DROP POLICY IF EXISTS "Members can delete org templates" ON public.phishing_templates;

-- INSERT: org-scoped templates require admin/manager in that org.
-- Shared templates (organization_id IS NULL) are restricted to global admins only.
CREATE POLICY "Admins/managers can insert org templates"
ON public.phishing_templates FOR INSERT TO authenticated
WITH CHECK (
  (organization_id IS NOT NULL AND public.is_org_writer(auth.uid(), organization_id))
  OR (organization_id IS NULL AND public.is_global_admin(auth.uid()))
);

CREATE POLICY "Admins/managers can update org templates"
ON public.phishing_templates FOR UPDATE TO authenticated
USING (
  (organization_id IS NOT NULL AND public.is_org_writer(auth.uid(), organization_id))
  OR (organization_id IS NULL AND public.is_global_admin(auth.uid()))
)
WITH CHECK (
  (organization_id IS NOT NULL AND public.is_org_writer(auth.uid(), organization_id))
  OR (organization_id IS NULL AND public.is_global_admin(auth.uid()))
);

CREATE POLICY "Admins/managers can delete org templates"
ON public.phishing_templates FOR DELETE TO authenticated
USING (
  (organization_id IS NOT NULL AND public.is_org_writer(auth.uid(), organization_id))
  OR (organization_id IS NULL AND public.is_global_admin(auth.uid()))
);
