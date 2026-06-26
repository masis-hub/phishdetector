
ALTER TABLE public.campaign_targets ADD COLUMN IF NOT EXISTS opened_at timestamptz DEFAULT NULL;
