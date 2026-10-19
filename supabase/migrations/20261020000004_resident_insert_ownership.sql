-- Prevent a signed-in resident from creating a pending profile for another auth user.
-- Service-role registration continues to bypass RLS and is unaffected.
DROP POLICY IF EXISTS "Residents can insert own pending row" ON public.residents;
CREATE POLICY "Residents can insert own pending row" ON public.residents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND verification_status = 'Pending');

-- Verify production security after deployment (read-only):
-- SELECT policyname, with_check FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'residents' AND cmd = 'INSERT';
