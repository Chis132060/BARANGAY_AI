-- Corrective RLS policies for resident-owned workflows.
-- Run this after 20260903000001 and 20260903000002 in Supabase SQL Editor.

-- Resident-owned subqueries in request workflow policies must be able to
-- resolve the current user's resident profile.
DROP POLICY IF EXISTS "Residents can view own profile" ON public.residents;
CREATE POLICY "Residents can view own profile"
  ON public.residents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_barangay_staff());

-- Residents need to see their own notification inbox and mark notifications
-- as read. Staff retain access through their module permission policies.
DROP POLICY IF EXISTS "Residents can read own notifications" ON public.notifications;
CREATE POLICY "Residents can read own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_module_permission('communication', 'view'));

DROP POLICY IF EXISTS "Residents can update own notifications" ON public.notifications;
CREATE POLICY "Residents can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_module_permission('communication', 'edit'))
  WITH CHECK (user_id = auth.uid() OR public.has_module_permission('communication', 'edit'));

-- Document types are public service metadata for authenticated residents.
DROP POLICY IF EXISTS "Authenticated users can read document types" ON public.document_types;
CREATE POLICY "Authenticated users can read document types"
  ON public.document_types
  FOR SELECT
  TO authenticated
  USING (true);
