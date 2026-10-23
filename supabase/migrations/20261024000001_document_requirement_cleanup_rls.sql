-- Resident-generated attachments must be removable by their uploader when
-- an upload succeeds but a later request insert fails. This policy is scoped
-- to the user's own path in only the document-requirements bucket.
-- Staging validation is mandatory before applying to production.
DROP POLICY IF EXISTS "Residents can delete their own requirements" ON storage.objects;
CREATE POLICY "Residents can delete their own requirements"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'document-requirements'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
