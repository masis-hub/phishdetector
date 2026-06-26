-- Add explicit SELECT policy on campaign_targets so admins/managers reads are unambiguous,
-- while keeping anon fully blocked (no policy => no access for anon role).
CREATE POLICY "Admins and managers can view targets"
  ON public.campaign_targets
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );