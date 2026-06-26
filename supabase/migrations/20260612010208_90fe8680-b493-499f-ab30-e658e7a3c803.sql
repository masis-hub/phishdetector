
-- ============== 1. Schema additions ==============
ALTER TABLE public.campaign_targets   ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_results   ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.phishing_templates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_campaign_targets_org   ON public.campaign_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_results_org   ON public.campaign_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_phishing_templates_org ON public.phishing_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org          ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org           ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_mitigation_plans_org   ON public.mitigation_plans(organization_id);

-- ============== 2. Helper function ==============
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id
  );
$$;

-- ============== 3. Drop ALL existing policies on data tables ==============
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'campaigns','campaign_targets','campaign_results','contacts',
        'phishing_templates','organizations','mitigation_plans',
        'reviews','security_findings','auth_failed_attempts'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============== 4. GRANTS (explicit) ==============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_targets    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_results    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phishing_templates  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mitigation_plans    TO authenticated;
GRANT SELECT                          ON public.reviews            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews             TO authenticated;
GRANT SELECT                          ON public.security_findings  TO authenticated;
GRANT SELECT                          ON public.auth_failed_attempts TO authenticated;
GRANT ALL ON public.campaigns, public.campaign_targets, public.campaign_results,
            public.contacts, public.phishing_templates, public.organizations,
            public.mitigation_plans, public.reviews, public.security_findings,
            public.auth_failed_attempts TO service_role;
REVOKE ALL ON public.campaigns, public.campaign_targets, public.campaign_results,
              public.contacts, public.phishing_templates, public.organizations,
              public.mitigation_plans, public.reviews, public.security_findings,
              public.auth_failed_attempts FROM anon;

-- ============== 5. Strict per-organization policies ==============

-- organizations: members can view their own org; only existing members can update; insert allowed for any authenticated user (becomes the creator, then must self-assign role); delete by global admin only
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Members can update their organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), id))
  WITH CHECK (public.is_org_member(auth.uid(), id));
CREATE POLICY "Global admins can insert organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (public.is_global_admin(auth.uid()));
CREATE POLICY "Global admins can delete organizations"
  ON public.organizations FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- campaigns
CREATE POLICY "Members can view org campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org campaigns"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org campaigns"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org campaigns"
  ON public.campaigns FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- campaign_targets
CREATE POLICY "Members can view org targets"
  ON public.campaign_targets FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org targets"
  ON public.campaign_targets FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org targets"
  ON public.campaign_targets FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org targets"
  ON public.campaign_targets FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- campaign_results
CREATE POLICY "Members can view org results"
  ON public.campaign_results FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org results"
  ON public.campaign_results FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org results"
  ON public.campaign_results FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org results"
  ON public.campaign_results FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- contacts
CREATE POLICY "Members can view org contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org contacts"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org contacts"
  ON public.contacts FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- mitigation_plans
CREATE POLICY "Members can view org plans"
  ON public.mitigation_plans FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org plans"
  ON public.mitigation_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org plans"
  ON public.mitigation_plans FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org plans"
  ON public.mitigation_plans FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- phishing_templates: NULL organization_id = shared global catalog (read-only for all authenticated); per-org templates restricted
CREATE POLICY "View shared or own org templates"
  ON public.phishing_templates FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org templates"
  ON public.phishing_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org templates"
  ON public.phishing_templates FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org templates"
  ON public.phishing_templates FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- reviews: public read (product reviews shown publicly), only global admin manages
CREATE POLICY "Anyone authenticated can view published reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (is_published = true OR public.is_global_admin(auth.uid()));
CREATE POLICY "Global admins manage reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

-- security_findings: global admin only
CREATE POLICY "Global admins manage security findings"
  ON public.security_findings FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

-- auth_failed_attempts: global admin only
CREATE POLICY "Global admins view failed attempts"
  ON public.auth_failed_attempts FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()));
