
CREATE OR REPLACE FUNCTION public.set_campaign_target_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.campaigns
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_campaign_target_org ON public.campaign_targets;
CREATE TRIGGER trg_set_campaign_target_org
BEFORE INSERT ON public.campaign_targets
FOR EACH ROW EXECUTE FUNCTION public.set_campaign_target_org();
