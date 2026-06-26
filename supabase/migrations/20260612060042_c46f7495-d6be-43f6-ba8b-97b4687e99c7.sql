DROP POLICY IF EXISTS "Authenticated users can read active sender domains" ON public.sender_domains;

CREATE POLICY "Org writers can read active sender domains"
ON public.sender_domains
FOR SELECT
TO authenticated
USING (
  is_global_admin(auth.uid())
  OR (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin','manager')
    )
  )
);