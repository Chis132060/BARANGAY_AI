-- Program status controls PWA visibility. Programs remain visible until staff
-- explicitly deactivate them; applications never close because of a slot cap.
UPDATE public.barangay_programs
SET status = 'Inactive', is_public = false, registration_open = false
WHERE status = 'On Hold';

UPDATE public.barangay_programs
SET event_end_at = NULL, max_participants = NULL
WHERE event_end_at IS NOT NULL OR max_participants IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_program_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.registration_opens_at IS NOT NULL
     AND NEW.registration_deadline IS NOT NULL
     AND NEW.registration_opens_at >= NEW.registration_deadline THEN
    RAISE EXCEPTION 'Registration opens must precede the deadline';
  END IF;

  IF NEW.status = 'Active' THEN
    NEW.is_public := true;
  ELSE
    NEW.is_public := false;
    NEW.registration_open := false;
  END IF;

  IF NEW.registration_open AND (
    NEW.status <> 'Active'
    OR NOT NEW.is_public
    OR (NEW.registration_deadline IS NOT NULL AND NEW.registration_deadline <= now())
    OR (NEW.registration_opens_at IS NOT NULL AND NEW.registration_opens_at > now())
  ) THEN
    RAISE EXCEPTION 'Registration requires an active program and a current registration window';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_program_enrollment_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p public.barangay_programs%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.barangay_programs WHERE id = NEW.program_id FOR UPDATE;
  IF NOT FOUND
     OR p.status <> 'Active'
     OR NOT p.is_public
     OR NOT p.registration_open
     OR (p.registration_deadline IS NOT NULL AND p.registration_deadline <= now())
     OR (p.registration_opens_at IS NOT NULL AND p.registration_opens_at > now()) THEN
    RAISE EXCEPTION 'Program registration is not available';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_to_barangay_program(p_program_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  r public.residents%ROWTYPE;
  p public.barangay_programs%ROWTYPE;
  v_id uuid;
  age_years integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  SELECT * INTO r FROM public.residents
    WHERE user_id = auth.uid() AND verification_status = 'Verified' LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verified resident account required'; END IF;

  SELECT * INTO p FROM public.barangay_programs WHERE id = p_program_id FOR UPDATE;
  IF NOT FOUND OR p.is_public IS NOT TRUE OR p.status <> 'Active'
     OR p.registration_open IS NOT TRUE OR p.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Program registration unavailable';
  END IF;
  IF p.registration_deadline IS NOT NULL AND now() > p.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;
  IF p.registration_opens_at IS NOT NULL AND now() < p.registration_opens_at THEN
    RAISE EXCEPTION 'Registration has not opened yet';
  END IF;
  IF EXISTS (SELECT 1 FROM public.program_enrollees WHERE program_id = p_program_id AND resident_id = r.id) THEN
    RAISE EXCEPTION 'You already applied';
  END IF;

  IF p.min_age IS NOT NULL OR p.max_age IS NOT NULL THEN
    IF r.birth_date IS NULL THEN RAISE EXCEPTION 'Birth date required for eligibility'; END IF;
    age_years := date_part('year', age(r.birth_date))::integer;
    IF (p.min_age IS NOT NULL AND age_years < p.min_age)
       OR (p.max_age IS NOT NULL AND age_years > p.max_age) THEN
      RAISE EXCEPTION 'Age eligibility not met';
    END IF;
  END IF;

  INSERT INTO public.program_enrollees(program_id, resident_id, full_name, contact_number, purok, role, status)
  VALUES (p_program_id, r.id, trim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')),
          r.contact_number, p.purok, 'Applicant', 'Pending')
  RETURNING id INTO v_id;

  INSERT INTO public.program_activity_logs(program_id, application_id, actor_id, action)
  VALUES (p_program_id, v_id, auth.uid(), 'Applied');
  RETURN v_id;
END;
$$;
