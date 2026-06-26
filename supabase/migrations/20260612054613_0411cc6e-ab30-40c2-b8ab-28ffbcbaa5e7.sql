
-- Pool global de dominios remitentes verificados en Resend
CREATE TABLE public.sender_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  default_local_part text NOT NULL DEFAULT 'alertas',
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sender_domains TO authenticated;
GRANT ALL ON public.sender_domains TO service_role;

ALTER TABLE public.sender_domains ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede LEER los dominios activos (para mostrarlos en selects)
CREATE POLICY "Authenticated users can read active sender domains"
  ON public.sender_domains FOR SELECT TO authenticated
  USING (is_active = true OR public.is_global_admin(auth.uid()));

-- Solo el global admin puede gestionar el pool
CREATE POLICY "Global admins manage sender domains"
  ON public.sender_domains FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

CREATE TRIGGER trg_sender_domains_updated_at
  BEFORE UPDATE ON public.sender_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Dominio por defecto por organización
ALTER TABLE public.organizations
  ADD COLUMN sender_domain_id uuid REFERENCES public.sender_domains(id) ON DELETE SET NULL;

-- Override opcional por campaña
ALTER TABLE public.campaigns
  ADD COLUMN sender_domain_id uuid REFERENCES public.sender_domains(id) ON DELETE SET NULL;

-- Semillas iniciales del pool (podés editar/borrar luego desde la UI de admin)
INSERT INTO public.sender_domains (domain, default_local_part, display_name, description) VALUES
  ('techsecureai.com', 'simulations', 'Techsecure AI (default)', 'Dominio por defecto del proveedor. Úselo solo para demos internas.');
