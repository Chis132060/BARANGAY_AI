-- Reinstate the original privacy boundary for raw AI ingestion documents.
-- An earlier migration temporarily granted authenticated SELECT to chunks;
-- this safety follow-up restores the documented server-only design.
REVOKE SELECT ON TABLE public.knowledge_chunks FROM authenticated;
DROP POLICY IF EXISTS "Residents can read active public knowledge metadata"
  ON public.knowledge_docs;
