-- Restrict access to campaign target PII (emails, names, departments)

ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;

-- Remove broad read access
DROP POLICY IF EXISTS "Authenticated users can view campaign targets" ON public.campaign_targets;

-- Ensure we have an explicit role-gated read policy
DROP POLICY IF EXISTS "Admins and managers can view campaign targets" ON public.campaign_targets;
CREATE POLICY "Admins and managers can view campaign targets"
  ON public.campaign_targets
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );
