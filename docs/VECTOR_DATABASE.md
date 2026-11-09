# Vector Database

BARANGAY_AI uses Supabase PostgreSQL with pgvector; a separate vector service is not
required for current scale. Existing migrations define knowledge_chunks, provider-specific
embedding tables, ingestion jobs and matching RPCs.

## Existing implementation

- knowledge_chunks stores text, metadata, source/trust fields, content hashes and versions.
- knowledge_embeddings_gemini and knowledge_embeddings_local isolate vector dimensions.
- ingestion_jobs tracks pending, processing, retry, completed and dead-letter work.
- match_knowledge_embeddings_gemini and _local perform cosine-distance retrieval.
- The API normalizes provider-specific chunk identifiers before downstream RAG processing.

## Operational rules

1. Never compare vectors from different embedding spaces or dimensions.
2. Re-embed when source content hash, model, model version or dimension changes.
3. Keep ingestion idempotent with bounded batches and retries.
4. Choose HNSW/IVFFlat/exact search only after measuring data volume and query plans.
5. Filter approved status, audience, effective dates and barangay scope in the database
   before returning candidates to the application.
6. Keep service-role credentials server-side and enable RLS on exposed tables.
7. Monitor queue age, retries/dead letters, embedding latency, retrieval latency, recall
   and stale embedding counts.

## Security and publication controls

Migration `supabase/migrations/20261109000001_knowledge_chunks_access_control.sql` removes direct
anon/authenticated table access and restricts resident-facing vector and keyword RPCs
to explicitly `audience='public'`, `publication_status='approved'`, currently
effective, non-expired, deployment-wide rows. Existing rows are deliberately migrated
to the safe `staff/draft` defaults. New ingestion is also forced to `staff/draft`;
it cannot publish content by supplying metadata. Publishing must be a separate reviewed
database/admin action after the source has been verified. Tenant-specific rows are
excluded until a trusted barangay scope is wired end-to-end. Backend retrieval uses the
server-only service role; never expose that credential to a browser.

## References

See ATE_SORA_AI_STACK.md, RAG_PIPELINE.md and KNOWLEDGE_BASE.md.
