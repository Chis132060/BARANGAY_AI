-- Secure management of official sources by authenticated document staff.
-- All write operations use the normal Supabase session and database permissions;
-- no service-role key is required by the Admin Portal.
GRANT SELECT, INSERT, UPDATE ON public.verified_legal_sources TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='verified_legal_sources'
    AND policyname='Document staff can review all legal sources') THEN
    CREATE POLICY "Document staff can review all legal sources"
      ON public.verified_legal_sources FOR SELECT TO authenticated
      USING (public.has_module_permission('documents','view'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='verified_legal_sources'
    AND policyname='Document authors create archived sources') THEN
    CREATE POLICY "Document authors create archived sources"
      ON public.verified_legal_sources FOR INSERT TO authenticated
      WITH CHECK (status = 'Archived' AND public.has_module_permission('documents','create'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='verified_legal_sources'
    AND policyname='Document approvers publish and editors archive') THEN
    CREATE POLICY "Document approvers publish and editors archive"
      ON public.verified_legal_sources FOR UPDATE TO authenticated
      USING (public.has_module_permission('documents','edit') OR public.has_module_permission('documents','approve'))
      WITH CHECK (
        (status='Archived' AND (public.has_module_permission('documents','edit') OR public.has_module_permission('documents','approve')))
        OR (status='Published' AND public.has_module_permission('documents','approve'))
      );
  END IF;
END $$;

-- Independently force an edited law/summary out of circulation until a
-- *separate* reviewer action republishes it. Enforced even on direct API writes.
CREATE OR REPLACE FUNCTION public.archive_changed_legal_source()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='public' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable legal-source identity cannot be changed';
  END IF;
  IF ROW(NEW.title,NEW.source_url,NEW.jurisdiction_scope,NEW.authority,NEW.summary,NEW.keywords)
      IS DISTINCT FROM
     ROW(OLD.title,OLD.source_url,OLD.jurisdiction_scope,OLD.authority,OLD.summary,OLD.keywords)
  THEN
    NEW.status := 'Archived';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS legal_sources_archive_edits ON public.verified_legal_sources;
CREATE TRIGGER legal_sources_archive_edits
BEFORE UPDATE ON public.verified_legal_sources FOR EACH ROW
EXECUTE FUNCTION public.archive_changed_legal_source();
