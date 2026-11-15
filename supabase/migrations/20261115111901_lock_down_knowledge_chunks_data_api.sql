-- Protect unreviewed barangay knowledge and policy uploads against public
-- retrieval/poisoning. The ingestion API uses the server-only service role.
-- Crucially do NOT revoke staff CRUD on knowledge_docs, which the Admin UI uses.
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Service role can insert knowledge chunks" ON public.knowledge_chunks;

REVOKE ALL PRIVILEGES ON TABLE public.knowledge_chunks FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.knowledge_chunks TO service_role;

-- Preserve existing backend-only service-role access without changing rows.
-- Resident/public policy answers do not query this table directly; they use
-- approved, source-scoped policies with separate RLS protections.
