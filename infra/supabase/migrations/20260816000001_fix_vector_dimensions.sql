drop function if exists match_knowledge_chunks(vector, double precision, integer);
drop index if exists knowledge_chunks_embedding_idx;

alter table public.knowledge_chunks alter column embedding type vector(3072);

-- Note: The 'ivfflat' index only supports up to 2000 dimensions.
-- Since our dataset is small and we are using 3072 dimensions, 
-- exact nearest-neighbor search (without an index) will be extremely fast and perfectly accurate.

create or replace function match_knowledge_chunks (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  doc_id text,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.doc_id,
    knowledge_chunks.chunk_index,
    knowledge_chunks.content,
    knowledge_chunks.metadata,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks
  where 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;
