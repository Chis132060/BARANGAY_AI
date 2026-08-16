-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the knowledge_chunks table
create table if not exists public.knowledge_chunks (
    id uuid default gen_random_uuid() primary key,
    doc_id text not null,
    chunk_index integer not null,
    content text not null,
    metadata jsonb default '{}'::jsonb,
    embedding vector(768), -- Google's text-embedding-004 produces 768-dimensional vectors
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index for faster similarity searches
create index if not exists knowledge_chunks_embedding_idx 
on public.knowledge_chunks 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Enable RLS
alter table public.knowledge_chunks enable row level security;

-- Policies: allow authenticated and anon reads (depending on your setup)
create policy "Allow public read access to knowledge_chunks"
on public.knowledge_chunks for select
to public
using (true);

-- Allow service role to insert/update/delete
create policy "Allow service role full access"
on public.knowledge_chunks for all
to service_role
using (true)
with check (true);

-- Create the match_knowledge_chunks RPC function for similarity search
drop function if exists match_knowledge_chunks(vector, double precision, integer);

create or replace function match_knowledge_chunks (
  query_embedding vector(768),
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
