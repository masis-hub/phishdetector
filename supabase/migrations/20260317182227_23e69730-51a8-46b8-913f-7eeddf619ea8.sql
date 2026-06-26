
-- Create mitigation/training plans table
CREATE TABLE public.mitigation_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'mitigation', -- 'mitigation', 'training', 'policy', 'simulation'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  responsible TEXT, -- person/team responsible
  start_date DATE,
  end_date DATE,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mitigation_plans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and managers can manage mitigation plans"
ON public.mitigation_plans
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can view mitigation plans"
ON public.mitigation_plans
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_mitigation_plans_updated_at
BEFORE UPDATE ON public.mitigation_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
