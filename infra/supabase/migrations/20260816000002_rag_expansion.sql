-- RAG Expansion Migration
-- Adds metadata columns to knowledge_docs and knowledge_chunks for grounding, trust classification, and deduplication.

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE knowledge_source_type AS ENUM ('LOCAL', 'WEB', 'DATABASE', 'API', 'TOOL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE knowledge_trust_level AS ENUM ('AUTHORITATIVE', 'TRUSTED', 'VERIFIED', 'GENERAL', 'UNVERIFIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter knowledge_docs (if it exists, assuming it does from seed_knowledge.py)
DO $$ BEGIN
    ALTER TABLE public.knowledge_docs
    ADD COLUMN source_type knowledge_source_type DEFAULT 'LOCAL',
    ADD COLUMN source_url text,
    ADD COLUMN source_domain text,
    ADD COLUMN trust_level knowledge_trust_level DEFAULT 'GENERAL',
    ADD COLUMN published_at timestamp with time zone,
    ADD COLUMN retrieved_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    ADD COLUMN content_hash text,
    ADD COLUMN version integer DEFAULT 1;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN duplicate_column THEN null;
END $$;

-- 3. Alter knowledge_chunks
ALTER TABLE public.knowledge_chunks
ADD COLUMN IF NOT EXISTS source_type knowledge_source_type DEFAULT 'LOCAL',
ADD COLUMN IF NOT EXISTS source_domain text,
ADD COLUMN IF NOT EXISTS trust_level knowledge_trust_level DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS retrieved_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS content_hash text,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- 4. Update the match_knowledge_chunks RPC to return these fields
DROP FUNCTION IF EXISTS match_knowledge_chunks(vector, double precision, integer);

CREATE OR REPLACE FUNCTION match_knowledge_chunks (
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
  published_at timestamp with time zone,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    knowledge_chunks.id,
    knowledge_chunks.doc_id,
    knowledge_chunks.chunk_index,
    knowledge_chunks.content,
    knowledge_chunks.metadata,
    knowledge_chunks.source_type,
    knowledge_chunks.source_domain,
    knowledge_chunks.trust_level,
    knowledge_chunks.published_at,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  FROM public.knowledge_chunks
  WHERE 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;
