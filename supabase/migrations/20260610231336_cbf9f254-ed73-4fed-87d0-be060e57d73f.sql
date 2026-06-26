
CREATE TABLE public.auth_failed_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_failed_attempts_email_created
  ON public.auth_failed_attempts (lower(email), created_at DESC);
CREATE INDEX idx_auth_failed_attempts_created
  ON public.auth_failed_attempts (created_at DESC);
CREATE INDEX idx_auth_failed_attempts_ip_created
  ON public.auth_failed_attempts (ip_address, created_at DESC);

GRANT SELECT ON public.auth_failed_attempts TO authenticated;
GRANT ALL ON public.auth_failed_attempts TO service_role;

ALTER TABLE public.auth_failed_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view failed login attempts"
  ON public.auth_failed_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
