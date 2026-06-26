ALTER TABLE public.phishing_templates
  ADD COLUMN IF NOT EXISTS subject_en TEXT,
  ADD COLUMN IF NOT EXISTS sender_name_en TEXT,
  ADD COLUMN IF NOT EXISTS html_content_en TEXT;