-- Source-verified, explicitly historical public archive; no current applications or push notifications.
CREATE TABLE IF NOT EXISTS public.tandang_sora_source_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE CHECK (source_key ~ '^(news|program|org):[A-Za-z0-9._-]+$'),
  section text NOT NULL CHECK (section IN ('news', 'program', 'organization')),
  title text NOT NULL CHECK (length(btrim(title)) >= 5),
  summary text NOT NULL CHECK (length(btrim(summary)) >= 25),
  publisher text NOT NULL CHECK (length(btrim(publisher)) >= 4),
  source_url text NOT NULL CHECK (
    source_url ~ '^https://((www\.)?butuan\.gov\.ph|pia\.gov\.ph|caraga\.emb\.gov\.ph|dams\.agusandelnorte\.gov\.ph)/'
  ),
  source_date date NULL,
  event_date date NULL,
  scope text NOT NULL CHECK (scope IN (
    'Local historical event', 'Barangay participation', 'Citywide coverage',
    'Citywide reference', 'Historical address'
  )),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ts_source_archive_public
  ON public.tandang_sora_source_archive (section, source_date DESC) WHERE is_public = true;
ALTER TABLE public.tandang_sora_source_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tandang_sora_source_archive FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.tandang_sora_source_archive TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.tandang_sora_source_archive TO authenticated;
DROP POLICY IF EXISTS "Public read sourced Tandang Sora archive" ON public.tandang_sora_source_archive;
CREATE POLICY "Public read sourced Tandang Sora archive"
  ON public.tandang_sora_source_archive FOR SELECT TO anon, authenticated
  USING (is_public = true);
DROP POLICY IF EXISTS "Staff manage sourced Tandang Sora archive" ON public.tandang_sora_source_archive;
CREATE POLICY "Staff manage sourced Tandang Sora archive"
  ON public.tandang_sora_source_archive FOR ALL TO authenticated
  USING (public.is_barangay_staff()) WITH CHECK (public.is_barangay_staff());
COMMENT ON TABLE public.tandang_sora_source_archive IS
  'Public historical coverage and prior citywide references with traceable government source. Not current registration, not staff-issued barangay notices; no auto push notification.';
