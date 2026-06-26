-- Recreate SELECT policies scoped to authenticated only (was public/{-})
DROP POLICY IF EXISTS "Admins and managers can view results" ON public.campaign_results;
CREATE POLICY "Admins and managers can view results" ON public.campaign_results
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Admins and managers can view campaigns" ON public.campaigns;
CREATE POLICY "Admins and managers can view campaigns" ON public.campaigns
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Admins and managers can view contacts" ON public.contacts;
CREATE POLICY "Admins and managers can view contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Admins and managers can view mitigation plans" ON public.mitigation_plans;
CREATE POLICY "Admins and managers can view mitigation plans" ON public.mitigation_plans
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Admins and managers can view organizations" ON public.organizations;
CREATE POLICY "Admins and managers can view organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Admins and managers can view templates" ON public.phishing_templates;
CREATE POLICY "Admins and managers can view templates" ON public.phishing_templates
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));