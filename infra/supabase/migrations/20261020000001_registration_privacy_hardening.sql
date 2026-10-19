-- Phase 1: remove permissive legacy policies. Permissive RLS policies are OR-combined.
-- Deploy after reviewing effective policies in the target Supabase instance.
BEGIN;

-- Residents should not receive blanket access to the residents module.
UPDATE public.permissions p
SET can_view = false
FROM public.roles r
WHERE p.role_id = r.id AND r.name = 'Resident' AND p.module = 'residents';

DROP POLICY IF EXISTS "Residents can select own row" ON public.residents;
CREATE POLICY "Residents can select own row" ON public.residents
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_permission('residents', 'can_view')
);

-- The previous address policies used can_view for write access. Restrict
-- residents to their own addresses; staff edits need explicit edit rights.
DROP POLICY IF EXISTS "Residents and staff can select addresses" ON public.addresses;
CREATE POLICY "Residents and staff can select addresses" ON public.addresses
FOR SELECT TO authenticated
USING (
  public.has_permission('residents', 'can_view')
  OR EXISTS (SELECT 1 FROM public.residents r
             WHERE r.id = addresses.resident_id AND r.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Residents and staff can insert addresses" ON public.addresses;
CREATE POLICY "Residents and staff can insert addresses" ON public.addresses
FOR INSERT TO authenticated
WITH CHECK (
  public.has_permission('residents', 'can_edit')
  OR EXISTS (SELECT 1 FROM public.residents r
             WHERE r.id = resident_id AND r.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Residents and staff can update addresses" ON public.addresses;
CREATE POLICY "Residents and staff can update addresses" ON public.addresses
FOR UPDATE TO authenticated
USING (
  public.has_permission('residents', 'can_edit')
  OR EXISTS (SELECT 1 FROM public.residents r
             WHERE r.id = addresses.resident_id AND r.user_id = (SELECT auth.uid()))
)
WITH CHECK (
  public.has_permission('residents', 'can_edit')
  OR EXISTS (SELECT 1 FROM public.residents r
             WHERE r.id = addresses.resident_id AND r.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Residents and staff can delete addresses" ON public.addresses;
CREATE POLICY "Residents and staff can delete addresses" ON public.addresses
FOR DELETE TO authenticated
USING (
  public.has_permission('residents', 'can_delete')
  OR EXISTS (SELECT 1 FROM public.residents r
             WHERE r.id = addresses.resident_id AND r.user_id = (SELECT auth.uid()))
);

-- Program and organization member lists contain private contact details.
DROP POLICY IF EXISTS "Authenticated can view enrollees" ON public.program_enrollees;
CREATE POLICY "Staff can view enrollees" ON public.program_enrollees
FOR SELECT TO authenticated
USING (public.has_permission('residents', 'can_view'));

DROP POLICY IF EXISTS "Authenticated can view org members" ON public.organization_members;
CREATE POLICY "Staff can view org members" ON public.organization_members
FOR SELECT TO authenticated
USING (public.has_permission('residents', 'can_view'));

COMMIT;
