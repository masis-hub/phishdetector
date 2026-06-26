
-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage orgs
CREATE POLICY "Admins and managers can manage organizations"
ON public.organizations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Authenticated users can view orgs
CREATE POLICY "Authenticated users can view organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (true);

-- Add organization_id to campaigns
ALTER TABLE public.campaigns ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
