-- Let authorized staff add pending, unlinked family member records.
-- They remain subject to the existing resident verification queue before
-- appearing in the verified registry or receiving resident account access.
DROP POLICY IF EXISTS "Staff can create pending household residents" ON public.residents;
CREATE POLICY "Staff can create pending household residents" ON public.residents
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL
    AND verification_status = 'Pending'
    AND (public.is_barangay_staff() OR public.has_module_permission('residents', 'create'))
  );

DROP POLICY IF EXISTS "Staff can manage households" ON public.households;
DROP POLICY IF EXISTS "Staff can view households" ON public.households;
CREATE POLICY "Staff can view households" ON public.households FOR SELECT TO authenticated
  USING (public.is_barangay_staff() OR public.has_module_permission('residents', 'view'));
DROP POLICY IF EXISTS "Staff can create households" ON public.households;
CREATE POLICY "Staff can create households" ON public.households FOR INSERT TO authenticated
  WITH CHECK (public.is_barangay_staff() OR public.has_module_permission('residents', 'create'));
DROP POLICY IF EXISTS "Staff can edit households" ON public.households;
CREATE POLICY "Staff can edit households" ON public.households FOR UPDATE TO authenticated
  USING (public.is_barangay_staff() OR public.has_module_permission('residents', 'edit'))
  WITH CHECK (public.is_barangay_staff() OR public.has_module_permission('residents', 'edit'));

DROP POLICY IF EXISTS "Staff can view household members" ON public.household_members;
CREATE POLICY "Staff can view household members" ON public.household_members
  FOR SELECT TO authenticated
  USING (public.is_barangay_staff() OR public.has_module_permission('residents', 'view'));

DROP POLICY IF EXISTS "Staff can add household members" ON public.household_members;
CREATE POLICY "Staff can add household members" ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_barangay_staff() OR public.has_module_permission('residents', 'create') OR public.has_module_permission('residents', 'edit'));

DROP POLICY IF EXISTS "Staff can remove household members" ON public.household_members;
CREATE POLICY "Staff can remove household members" ON public.household_members
  FOR DELETE TO authenticated
  USING (public.is_barangay_staff() OR public.has_module_permission('residents', 'delete'));

CREATE OR REPLACE FUNCTION public.join_household_by_number(p_household_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
  v_household_id uuid;
  v_existing_household_id uuid;
BEGIN
  SELECT id INTO v_resident_id FROM public.residents
   WHERE user_id = auth.uid() AND verification_status = 'Verified';
  IF v_resident_id IS NULL THEN RAISE EXCEPTION 'Verified resident profile required'; END IF;

  SELECT id INTO v_household_id FROM public.households
   WHERE lower(trim(household_number)) = lower(trim(p_household_number));
  IF v_household_id IS NULL THEN RAISE EXCEPTION 'Household number not found'; END IF;

  SELECT household_id INTO v_existing_household_id FROM public.household_members
   WHERE resident_id = v_resident_id;
  IF v_existing_household_id IS NOT NULL AND v_existing_household_id <> v_household_id THEN
    RAISE EXCEPTION 'Resident already belongs to a different household';
  END IF;

  INSERT INTO public.household_members(household_id, resident_id, relationship)
   VALUES (v_household_id, v_resident_id, 'Household Member')
   ON CONFLICT (resident_id) DO NOTHING;
  RETURN v_household_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_household_by_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_household_by_number(text) TO authenticated;
