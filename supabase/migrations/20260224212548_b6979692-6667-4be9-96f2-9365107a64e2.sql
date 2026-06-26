
-- Fix campaigns: drop permissive SELECT and replace with role-based
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
CREATE POLICY "Admins and managers can view campaigns"
  ON public.campaigns
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Fix organizations: drop permissive SELECT and replace with role-based
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON public.organizations;
CREATE POLICY "Admins and managers can view organizations"
  ON public.organizations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Fix phishing_templates: drop permissive SELECT and replace with role-based
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.phishing_templates;
CREATE POLICY "Admins and managers can view templates"
  ON public.phishing_templates
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Fix campaign_results: drop permissive SELECT and replace with role-based
DROP POLICY IF EXISTS "Authenticated users can view results" ON public.campaign_results;
CREATE POLICY "Admins and managers can view results"
  ON public.campaign_results
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Fix campaign_targets: remove duplicate SELECT policy (ALL policy already covers it)
DROP POLICY IF EXISTS "Admins and managers can view campaign targets" ON public.campaign_targets;
