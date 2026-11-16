-- Resident-safe official-source catalog. This is separate from the private
-- ingestion tables so residents cannot read unreviewed PDF text or metadata.
CREATE TABLE IF NOT EXISTS public.verified_legal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_url text NOT NULL,
  jurisdiction_scope text NOT NULL
    CHECK (jurisdiction_scope IN ('philippines','butuan_city','tandang_sora_butuan')),
  authority text NOT NULL
    CHECK (authority IN ('national_law','city_code_index','barangay_policy')),
  summary text NOT NULL CHECK (char_length(summary) >= 40),
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(keywords) = 'array'),
  status text NOT NULL DEFAULT 'Published'
    CHECK (status IN ('Published','Archived')),
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (title,source_url),
  CONSTRAINT verified_legal_sources_official_url
    CHECK (source_url ~* '^https://([a-z0-9-]+[.])+gov[.]ph(/|$)')
);

ALTER TABLE public.verified_legal_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.verified_legal_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.verified_legal_sources TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.verified_legal_sources TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='verified_legal_sources'
      AND policyname='Signed in residents read published verified legal references') THEN
    CREATE POLICY "Signed in residents read published verified legal references"
    ON public.verified_legal_sources FOR SELECT TO authenticated
    USING (status = 'Published' AND verified_at IS NOT NULL);
  END IF;
END $$;

-- One-time, idempotent migration of source-linked government references already
-- vetted by the publisher. This does NOT publish old GENERAL/unreviewed chunks.
-- New references may be added only by server-side authorized staff tooling.
INSERT INTO public.verified_legal_sources
  (title, source_url, jurisdiction_scope, authority, summary, keywords, status, verified_at)
SELECT DISTINCT ON (d.title,d.file_url)
  d.title,
  c.metadata->>'source_reference',
  c.metadata->>'jurisdiction_scope',
  c.metadata->>'authority',
  c.content,
  c.metadata->'keywords',
  'Published',
  c.published_at
FROM public.knowledge_docs d
JOIN public.knowledge_chunks c ON c.doc_id=d.id
WHERE d.status='active' AND d.audience='public' AND d.source_type='manual'
  AND c.source_type='WEB' AND c.trust_level='VERIFIED'
  AND c.published_at IS NOT NULL
  AND c.metadata->>'source_reference'=d.file_url
  AND (c.metadata->>'source_reference') ~* '^https://([a-z0-9-]+[.])+gov[.]ph(/|$)'
  AND c.metadata->>'jurisdiction_scope' IN ('philippines','butuan_city','tandang_sora_butuan')
  AND c.metadata->>'authority' IN ('national_law','city_code_index','barangay_policy')
  AND jsonb_typeof(c.metadata->'keywords')='array'
  AND char_length(c.content)>=40
ORDER BY d.title,d.file_url,c.chunk_index
ON CONFLICT (title,source_url) DO NOTHING;
