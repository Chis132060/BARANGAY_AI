-- Allow authorized barangay staff to read and update resident verification.
-- Run this after 20260903000003 in Supabase SQL Editor.

DROP POLICY IF EXISTS "Staff can read resident verification records" ON public.residents;
CREATE POLICY "Staff can read resident verification records"
  ON public.residents
  FOR SELECT
  TO authenticated
  USING (
    public.is_barangay_staff()
    OR
    public.has_module_permission('residents', 'view')
    OR public.has_module_permission('residents', 'approve')
    OR public.has_module_permission('residents', 'edit')
  );

DROP POLICY IF EXISTS "Staff can update resident verification records" ON public.residents;
CREATE POLICY "Staff can update resident verification records"
  ON public.residents
  FOR UPDATE
  TO authenticated
  USING (
    public.is_barangay_staff()
    OR
    public.has_module_permission('residents', 'approve')
    OR public.has_module_permission('residents', 'edit')
  )
  WITH CHECK (
    public.is_barangay_staff()
    OR
    public.has_module_permission('residents', 'approve')
    OR public.has_module_permission('residents', 'edit')
  );

DROP POLICY IF EXISTS "Staff can create resident notifications" ON public.notifications;
CREATE POLICY "Staff can create resident notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_barangay_staff()
    OR
    public.has_module_permission('communication', 'create')
    OR public.has_module_permission('communication', 'edit')
  );
