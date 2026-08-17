-- Embedding Spaces and Queue Migration
-- Implements isolated vector spaces for different embedding models and a persistent ingestion queue.

-- 1. Create Ingestion Jobs Queue
CREATE TABLE public.ingestion_jobs (
    job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES public.knowledge_docs(id) ON DELETE CASCADE,
    chunk_id uuid REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
    embedding_space_id text NOT NULL,
    provider text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, RETRY_PENDING, FAILED, DEAD_LETTER, COMPLETED
    attempt integer DEFAULT 0,
    retry_count integer DEFAULT 0,
    error_type text,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    
    -- Idempotency constraint: each chunk should only have one job per embedding space
    UNIQUE(chunk_id, embedding_space_id)
);

-- 2. Create Isolated Vector Space for Gemini (3072d)
CREATE TABLE public.knowledge_embeddings_gemini (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id uuid REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
    embedding_space_id text NOT NULL, -- e.g. "gemini-embedding-2-v1"
    provider text NOT NULL,
    model text NOT NULL,
    model_version text NOT NULL,
    dimension integer NOT NULL DEFAULT 3072,
    content_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    embedding vector(3072),
    
    -- Ensure exactly one Gemini embedding per chunk
    UNIQUE(chunk_id)
);

-- Index for Gemini embeddings
-- Note: pgvector restricts HNSW indexes to 2000 dimensions. 
-- Since Gemini is 3072 dimensions, we rely on Exact Nearest Neighbor (sequential scan)
-- which is perfectly fast for typical RAG workloads without an index.
-- CREATE INDEX ON public.knowledge_embeddings_gemini USING hnsw (embedding vector_cosine_ops);

-- 3. Create Isolated Vector Space for Local (384d)
CREATE TABLE public.knowledge_embeddings_local (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id uuid REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
    embedding_space_id text NOT NULL, -- e.g. "all-MiniLM-L6-v2-v1"
    provider text NOT NULL,
    model text NOT NULL,
    model_version text NOT NULL,
    dimension integer NOT NULL DEFAULT 384,
    content_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    embedding vector(384),
    
    -- Ensure exactly one Local embedding per chunk
    UNIQUE(chunk_id)
);

-- Index for Local embeddings
CREATE INDEX ON public.knowledge_embeddings_local USING hnsw (embedding vector_cosine_ops);

-- 4. Create Match RPC for Gemini
CREATE OR REPLACE FUNCTION match_knowledge_embeddings_gemini (
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
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as chunk_id,
        c.document_id,
        c.content,
        c.trust_level::text,
        c.source_type::text,
        d.source_url,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_embeddings_gemini e
    JOIN public.knowledge_chunks c ON e.chunk_id = c.id
    JOIN public.knowledge_docs d ON c.document_id = d.id
    WHERE 
        1 - (e.embedding <=> query_embedding) > match_threshold
        AND (array_length(filter_trust_level, 1) IS NULL OR c.trust_level::text = ANY(filter_trust_level))
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Create Match RPC for Local
CREATE OR REPLACE FUNCTION match_knowledge_embeddings_local (
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
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as chunk_id,
        c.document_id,
        c.content,
        c.trust_level::text,
        c.source_type::text,
        d.source_url,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_embeddings_local e
    JOIN public.knowledge_chunks c ON e.chunk_id = c.id
    JOIN public.knowledge_docs d ON c.document_id = d.id
    WHERE 
        1 - (e.embedding <=> query_embedding) > match_threshold
        AND (array_length(filter_trust_level, 1) IS NULL OR c.trust_level::text = ANY(filter_trust_level))
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
