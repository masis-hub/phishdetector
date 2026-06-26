-- Add unique constraint on campaign_results.campaign_id for upsert support
ALTER TABLE public.campaign_results ADD CONSTRAINT campaign_results_campaign_id_unique UNIQUE (campaign_id);