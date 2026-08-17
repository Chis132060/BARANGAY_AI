-- Production Hardening Migration
-- 1. Full Text Search RPC
-- 2. Tool Data Tables
-- 3. AI Feedback Table

-- 1. Full Text Search setup for Hybrid Retrieval
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS fts_vector tsvector;
UPDATE public.knowledge_chunks SET fts_vector = to_tsvector('english', content);
CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx ON public.knowledge_chunks USING GIN (fts_vector);

-- Create RPC for keyword search
CREATE OR REPLACE FUNCTION keyword_search_chunks(search_term text, match_count int)
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
  rank float4
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    doc_id,
    chunk_index,
    content,
    metadata,
    source_type,
    source_domain,
    trust_level,
    published_at,
    ts_rank(fts_vector, websearch_to_tsquery('english', search_term)) as rank
  FROM public.knowledge_chunks
  WHERE fts_vector @@ websearch_to_tsquery('english', search_term)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

-- 2. Buses Table (For Live Data Tool Execution)
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE')),
    current_location TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Insert dummy active buses for the tool to pick up dynamically
INSERT INTO public.buses (bus_id, status, current_location)
VALUES 
    ('B-101', 'ACTIVE', 'City Hall Terminal'),
    ('B-102', 'ACTIVE', 'North Gate'),
    ('B-103', 'MAINTENANCE', 'Depot')
ON CONFLICT (bus_id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to buses" ON public.buses FOR SELECT USING (true);

-- 3. AI Feedback Table
CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    rating TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert access to feedback" ON public.ai_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Service read access to feedback" ON public.ai_feedback FOR SELECT USING (true);
