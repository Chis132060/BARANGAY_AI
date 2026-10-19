-- Reconcile legacy enrollee policies and statuses with the live application workflow.
-- Idempotent for environments where the newer policies already exist.
ALTER TABLE public.program_enrollees ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.program_enrollees
  DROP CONSTRAINT IF EXISTS program_enrollees_status_check;
ALTER TABLE public.program_enrollees
  DROP CONSTRAINT IF EXISTS program_enrollees_role_check;

-- Old migration allowed any authenticated account to view every enrollee.
DROP POLICY IF EXISTS "Authenticated can view enrollees" ON public.program_enrollees;
DROP POLICY IF EXISTS "Staff can manage enrollees" ON public.program_enrollees;
DROP POLICY IF EXISTS "Staff read enrollees" ON public.program_enrollees;
DROP POLICY IF EXISTS "Residents read own applications" ON public.program_enrollees;

-- The existing is_barangay_staff() function checks the user's staff role.
CREATE POLICY "Staff read enrollees"
  ON public.program_enrollees FOR SELECT TO authenticated
  USING (public.is_barangay_staff());

CREATE POLICY "Residents read own applications"
  ON public.program_enrollees FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = program_enrollees.resident_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Staff manage enrollees"
  ON public.program_enrollees FOR ALL TO authenticated
  USING (public.is_barangay_staff())
  WITH CHECK (public.is_barangay_staff());

-- Prevent duplicate applications for the same resident/program pair.
CREATE UNIQUE INDEX IF NOT EXISTS program_enrollees_unique_resident_idx
  ON public.program_enrollees (program_id, resident_id)
  WHERE resident_id IS NOT NULL;

-- Do not alter live data or automatically approve any applicant.
