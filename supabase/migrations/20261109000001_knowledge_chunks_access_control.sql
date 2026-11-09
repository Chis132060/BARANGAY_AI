-- Ate Sora knowledge access hardening.
-- Existing rows are intentionally classified as staff/draft by the column defaults.
-- A document must be explicitly reviewed and published before resident-facing RAG can return it.
-- barangay_id NULL means shared within this single-barangay deployment. Tenant-specific
-- documents remain excluded until a trusted tenant ID is configured by the backend.

ALTER TABLE public.knowledge_chunks
    ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'staff',
    ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS effective_from timestamptz,
    ADD COLUMN IF NOT EXISTS expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS barangay_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'knowledge_chunks_audience_check'
          AND conrelid = 'public.knowledge_chunks'::regclass
    ) THEN
        ALTER TABLE public.knowledge_chunks
            ADD CONSTRAINT knowledge_chunks_audience_check
            CHECK (audience IN ('public', 'staff'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'knowledge_chunks_publication_status_check'
          AND conrelid = 'public.knowledge_chunks'::regclass
    ) THEN
        ALTER TABLE public.knowledge_chunks
            ADD CONSTRAINT knowledge_chunks_publication_status_check
            CHECK (publication_status IN ('draft', 'approved', 'archived'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'knowledge_chunks_effective_window_check'
          AND conrelid = 'public.knowledge_chunks'::regclass
    ) THEN
        ALTER TABLE public.knowledge_chunks
            ADD CONSTRAINT knowledge_chunks_effective_window_check
            CHECK (effective_from IS NULL OR expires_at IS NULL OR expires_at > effective_from);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS knowledge_chunks_resident_visibility_idx
    ON public.knowledge_chunks (audience, publication_status, barangay_id, effective_from, expires_at);

-- Remove direct Data API access. The API uses the server-only service role and
-- the retrieval RPCs below enforce resident visibility before returning text.
DROP POLICY IF EXISTS "Allow public read access to knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Allow service role full access" ON public.knowledge_chunks;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.knowledge_chunks FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.knowledge_chunks TO service_role;
CREATE POLICY "Service role manages knowledge chunks"
    ON public.knowledge_chunks FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Embeddings and ingestion metadata are backend-only, not resident Data API tables.
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'knowledge_embeddings_gemini',
        'knowledge_embeddings_local',
        'ingestion_jobs',
        'knowledge_entities',
        'knowledge_relationships',
        'knowledge_docs'
    ]
    LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
            EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', table_name);
        END IF;
    END LOOP;
END $$;

DROP POLICY IF EXISTS "Entities are viewable by everyone." ON public.knowledge_entities;
DROP POLICY IF EXISTS "Relationships are viewable by everyone." ON public.knowledge_relationships;

-- Resident-facing vector retrieval: only explicitly public, approved, currently
-- effective, non-expired, deployment-wide content is eligible. Tenant-specific
-- rows are fail-closed until the API supplies a verified barangay scope.
CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings_gemini (
    query_embedding vector(3072),
    match_threshold float,
    match_count int,
    filter_trust_level text[] DEFAULT '{}'
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    content text,
    trust_level text,
    source_type text,
    source_url text,
    similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS chunk_id,
        d.id AS document_id,
        c.content,
        c.trust_level::text,
        c.source_type::text,
        d.source_url,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_embeddings_gemini e
    JOIN public.knowledge_chunks c ON e.chunk_id = c.id
    JOIN public.knowledge_docs d ON d.id::text = c.doc_id::text
    WHERE
        1 - (e.embedding <=> query_embedding) > match_threshold
        AND (array_length(filter_trust_level, 1) IS NULL OR c.trust_level::text = ANY(filter_trust_level))
        AND c.audience = 'public'
        AND c.publication_status = 'approved'
        AND (c.effective_from IS NULL OR c.effective_from <= now())
        AND (c.expires_at IS NULL OR c.expires_at > now())
        AND c.barangay_id IS NULL
    ORDER BY e.embedding <=> query_embedding
    LIMIT LEAST(GREATEST(match_count, 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings_local (
    query_embedding vector(384),
    match_threshold float,
    match_count int,
    filter_trust_level text[] DEFAULT '{}'
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    content text,
    trust_level text,
    source_type text,
    source_url text,
    similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS chunk_id,
        d.id AS document_id,
        c.content,
        c.trust_level::text,
        c.source_type::text,
        d.source_url,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_embeddings_local e
    JOIN public.knowledge_chunks c ON e.chunk_id = c.id
    JOIN public.knowledge_docs d ON d.id::text = c.doc_id::text
    WHERE
        1 - (e.embedding <=> query_embedding) > match_threshold
        AND (array_length(filter_trust_level, 1) IS NULL OR c.trust_level::text = ANY(filter_trust_level))
        AND c.audience = 'public'
        AND c.publication_status = 'approved'
        AND (c.effective_from IS NULL OR c.effective_from <= now())
        AND (c.expires_at IS NULL OR c.expires_at > now())
        AND c.barangay_id IS NULL
    ORDER BY e.embedding <=> query_embedding
    LIMIT LEAST(GREATEST(match_count, 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.keyword_search_chunks(search_term text, match_count int)
RETURNS TABLE (
    id uuid,
    doc_id text,
    chunk_index int,
    content text,
    metadata jsonb,
    source_type knowledge_source_type,
    source_domain text,
    trust_level knowledge_trust_level,
    published_at timestamptz,
    rank float4
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
    SELECT
        c.id,
        c.doc_id,
        c.chunk_index,
        c.content,
        c.metadata,
        c.source_type,
        c.source_domain,
        c.trust_level,
        c.published_at,
        ts_rank(c.fts_vector, websearch_to_tsquery('english', search_term)) AS rank
    FROM public.knowledge_chunks c
    WHERE c.fts_vector @@ websearch_to_tsquery('english', search_term)
      AND c.audience = 'public'
      AND c.publication_status = 'approved'
      AND (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND c.barangay_id IS NULL
    ORDER BY rank DESC
    LIMIT LEAST(GREATEST(match_count, 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks (
    query_embedding vector(3072),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id uuid,
    doc_id text,
    chunk_index int,
    content text,
    metadata jsonb,
    source_type knowledge_source_type,
    source_domain text,
    trust_level knowledge_trust_level,
    published_at timestamptz,
    similarity float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
    SELECT
        c.id,
        c.doc_id,
        c.chunk_index,
        c.content,
        c.metadata,
        c.source_type,
        c.source_domain,
        c.trust_level,
        c.published_at,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_chunks c
    WHERE c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> query_embedding) > match_threshold
      AND c.audience = 'public'
      AND c.publication_status = 'approved'
      AND (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND c.barangay_id IS NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT LEAST(GREATEST(match_count, 1), 100);
$$;

-- These RPCs are callable only with the backend service role. In particular,
-- no anon/authenticated client can bypass table RLS through a public RPC.
REVOKE ALL ON FUNCTION public.match_knowledge_embeddings_gemini(vector, double precision, integer, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_knowledge_embeddings_local(vector, double precision, integer, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.keyword_search_chunks(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector, double precision, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_knowledge_embeddings_gemini(vector, double precision, integer, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_embeddings_local(vector, double precision, integer, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.keyword_search_chunks(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector, double precision, integer) TO service_role;
