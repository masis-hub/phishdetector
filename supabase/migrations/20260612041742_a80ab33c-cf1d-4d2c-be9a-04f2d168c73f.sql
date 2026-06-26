
-- Restrict write access on campaign_targets and campaign_results to org writers (admin/manager)
DROP POLICY IF EXISTS "Members can insert org targets" ON public.campaign_targets;
DROP POLICY IF EXISTS "Members can update org targets" ON public.campaign_targets;
DROP POLICY IF EXISTS "Members can delete org targets" ON public.campaign_targets;

CREATE POLICY "Writers can insert org targets" ON public.campaign_targets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_writer(auth.uid(), organization_id));
CREATE POLICY "Writers can update org targets" ON public.campaign_targets
  FOR UPDATE TO authenticated
  USING (public.is_org_writer(auth.uid(), organization_id))
  WITH CHECK (public.is_org_writer(auth.uid(), organization_id));
CREATE POLICY "Writers can delete org targets" ON public.campaign_targets
  FOR DELETE TO authenticated
  USING (public.is_org_writer(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can insert org results" ON public.campaign_results;
DROP POLICY IF EXISTS "Members can update org results" ON public.campaign_results;
DROP POLICY IF EXISTS "Members can delete org results" ON public.campaign_results;

CREATE POLICY "Writers can insert org results" ON public.campaign_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_writer(auth.uid(), organization_id));
CREATE POLICY "Writers can update org results" ON public.campaign_results
  FOR UPDATE TO authenticated
  USING (public.is_org_writer(auth.uid(), organization_id))
  WITH CHECK (public.is_org_writer(auth.uid(), organization_id));
CREATE POLICY "Writers can delete org results" ON public.campaign_results
  FOR DELETE TO authenticated
  USING (public.is_org_writer(auth.uid(), organization_id));

-- Allow org admins/managers to view roles of co-members in their org
CREATE POLICY "Org writers can view roles in their orgs" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.is_org_writer(auth.uid(), organization_id)
  );
