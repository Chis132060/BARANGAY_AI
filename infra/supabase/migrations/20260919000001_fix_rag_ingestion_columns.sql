-- Fix the RAG ingestion path to use the knowledge_chunks.doc_id column
-- defined by the base schema and keep the Gemini retrieval RPC aligned.

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
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

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
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
