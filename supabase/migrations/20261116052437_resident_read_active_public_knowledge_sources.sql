-- Public legal and service guidance is readable to authenticated residents.
-- Existing RLS on knowledge_chunks only exposes chunks whose parent
-- knowledge_docs row has status='active' and audience='public'.
-- Draft, staff-only and admin-only records remain private.
GRANT SELECT ON TABLE public.knowledge_chunks TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'knowledge_docs'
      AND policyname = 'Residents can read active public knowledge metadata'
  ) THEN
    CREATE POLICY "Residents can read active public knowledge metadata"
    ON public.knowledge_docs
    FOR SELECT TO authenticated
    USING (status = 'active' AND audience = 'public');
  END IF;
END
$$;
