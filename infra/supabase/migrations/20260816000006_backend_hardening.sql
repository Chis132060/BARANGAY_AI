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

-- 2. Barangay Live Data Tables (for AI Tool Planner — single source of truth)
-- These are the authoritative operational tables for the Barangay AI system.
-- The AI Tool Planner queries these tables directly; there are no duplicates.

-- Barangay Officials (elected + appointed)
CREATE TABLE IF NOT EXISTS public.barangay_officials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    position TEXT NOT NULL,  -- e.g., 'Barangay Captain', 'Kagawad', 'SK Chairperson'
    committee TEXT,          -- e.g., 'Peace and Order', 'Health'
    term_start DATE,
    term_end DATE,
    contact_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_officials_active ON public.barangay_officials(is_active);
ALTER TABLE public.barangay_officials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access to officials" ON public.barangay_officials;
CREATE POLICY "Public read access to officials" ON public.barangay_officials FOR SELECT USING (true);

-- Barangay Services (clearances, certificates, blotters, etc.)
CREATE TABLE IF NOT EXISTS public.barangay_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,  -- e.g., 'Barangay Clearance', 'Certificate of Indigency'
    description TEXT,
    requirements TEXT[],         -- list of required documents
    processing_days INTEGER DEFAULT 1,
    fee_php NUMERIC(10,2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.barangay_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access to services" ON public.barangay_services;
CREATE POLICY "Public read access to services" ON public.barangay_services FOR SELECT USING (true);

-- Barangay Announcements
CREATE TABLE IF NOT EXISTS public.barangay_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',  -- e.g., 'HEALTH', 'SAFETY', 'EVENT', 'GENERAL'
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.barangay_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access to published announcements" ON public.barangay_announcements;
CREATE POLICY "Public read access to published announcements"
    ON public.barangay_announcements FOR SELECT
    USING (is_published = TRUE AND (expires_at IS NULL OR expires_at > NOW()));


-- 3. AI Feedback Table
CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    rating TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert access to feedback" ON public.ai_feedback;
DROP POLICY IF EXISTS "Service read access to feedback" ON public.ai_feedback;
CREATE POLICY "Public insert access to feedback" ON public.ai_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Service read access to feedback" ON public.ai_feedback FOR SELECT USING (true);
