-- Migration: Knowledge Graph Schema
-- Defines the structure for storing Extracted Entities and Relationships with strict Provenance.

-- 1. Entities Table
CREATE TABLE IF NOT EXISTS public.knowledge_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., 'Barangay Clearance'
    entity_type TEXT NOT NULL, -- e.g., 'DOCUMENT', 'OFFICE', 'OFFICIAL', 'SERVICE'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast entity lookup by name
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_name ON public.knowledge_entities(name);
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_type ON public.knowledge_entities(entity_type);

-- 2. Relationships Table (Requires Strict Provenance)
CREATE TABLE IF NOT EXISTS public.knowledge_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_entity_id UUID NOT NULL REFERENCES public.knowledge_entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES public.knowledge_entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- e.g., 'PROVIDED_BY', 'REQUIRES', 'DEFINED_BY'
    
    -- Strict Provenance Requirements (cannot invent relationships)
    source_document_id UUID NOT NULL REFERENCES public.knowledge_docs(id) ON DELETE CASCADE,
    source_chunk_id UUID REFERENCES public.knowledge_chunks(id) ON DELETE SET NULL,
    confidence FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate relationships from the same chunk
    UNIQUE(source_entity_id, target_entity_id, relationship_type, source_chunk_id)
);

-- Index for traversing the graph
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source ON public.knowledge_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target ON public.knowledge_relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_doc ON public.knowledge_relationships(source_document_id);

-- Enable RLS
ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies (read-only for all authenticated/anon roles, writable by service role)
CREATE POLICY "Entities are viewable by everyone." 
    ON public.knowledge_entities FOR SELECT USING (true);
    
CREATE POLICY "Relationships are viewable by everyone." 
    ON public.knowledge_relationships FOR SELECT USING (true);
