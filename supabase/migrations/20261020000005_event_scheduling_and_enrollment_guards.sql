-- Event scheduling and safe enrollment guards. Apply before deploying new UI.
ALTER TABLE public.barangay_programs ADD COLUMN IF NOT EXISTS event_start_at timestamptz, ADD COLUMN IF NOT EXISTS event_end_at timestamptz, ADD COLUMN IF NOT EXISTS registration_opens_at timestamptz;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS event_start_at timestamptz, ADD COLUMN IF NOT EXISTS event_end_at timestamptz, ADD COLUMN IF NOT EXISTS venue text;
CREATE OR REPLACE FUNCTION public.guard_program_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.event_start_at IS NOT NULL AND NEW.event_end_at IS NOT NULL AND NEW.event_end_at <= NEW.event_start_at THEN RAISE EXCEPTION 'Event end must be after start'; END IF;
 IF NEW.registration_opens_at IS NOT NULL AND NEW.registration_deadline IS NOT NULL AND NEW.registration_opens_at >= NEW.registration_deadline THEN RAISE EXCEPTION 'Registration opens must precede deadline'; END IF;
 IF NEW.event_start_at IS NOT NULL AND NEW.registration_deadline IS NOT NULL AND NEW.registration_deadline > NEW.event_start_at THEN RAISE EXCEPTION 'Deadline must precede event'; END IF;
 IF NEW.is_public AND NEW.status='Active' AND (NEW.event_start_at IS NULL OR NEW.event_end_at IS NULL OR nullif(trim(NEW.venue),'') IS NULL) THEN RAISE EXCEPTION 'Published active programs require event dates and venue'; END IF;
 IF NEW.registration_open AND (NOT NEW.is_public OR NEW.status <> 'Active' OR NEW.event_start_at IS NULL OR NEW.event_end_at IS NULL OR NEW.registration_deadline IS NULL OR NEW.event_start_at <= now() OR NEW.registration_deadline <= now()) THEN RAISE EXCEPTION 'Registration requires published scheduled program and future deadline'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_program_schedule ON public.barangay_programs;
CREATE TRIGGER trg_guard_program_schedule BEFORE INSERT OR UPDATE ON public.barangay_programs FOR EACH ROW EXECUTE FUNCTION public.guard_program_schedule();
CREATE OR REPLACE FUNCTION public.guard_announcement_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.event_start_at IS NOT NULL AND NEW.event_end_at IS NOT NULL AND NEW.event_end_at <= NEW.event_start_at THEN RAISE EXCEPTION 'Announcement event end must follow start'; END IF;
 IF NEW.status='Published' AND NEW.category IN ('Event','Program') AND (NEW.event_start_at IS NULL OR NEW.event_end_at IS NULL OR nullif(trim(NEW.venue),'') IS NULL) THEN RAISE EXCEPTION 'Published event requires dates and venue'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_announcement_schedule ON public.announcements;
CREATE TRIGGER trg_guard_announcement_schedule BEFORE INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.guard_announcement_schedule();
CREATE OR REPLACE FUNCTION public.guard_program_enrollment_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.barangay_programs%ROWTYPE;
BEGIN
 SELECT * INTO p FROM public.barangay_programs WHERE id=NEW.program_id FOR UPDATE;
 IF NOT FOUND OR p.status <> 'Active' OR NOT p.is_public OR NOT p.registration_open OR p.event_start_at IS NULL OR p.event_start_at <= now() OR p.registration_deadline IS NULL OR p.registration_deadline <= now() OR (p.registration_opens_at IS NOT NULL AND p.registration_opens_at > now()) THEN RAISE EXCEPTION 'Program registration is not available'; END IF;
 IF p.max_participants IS NOT NULL AND p.max_participants > 0 AND (SELECT count(*) FROM public.program_enrollees WHERE program_id=NEW.program_id AND status IN ('Pending','Approved','Active')) >= p.max_participants THEN RAISE EXCEPTION 'Program capacity reached'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_program_enrollment_schedule ON public.program_enrollees;
CREATE TRIGGER trg_guard_program_enrollment_schedule BEFORE INSERT ON public.program_enrollees FOR EACH ROW EXECUTE FUNCTION public.guard_program_enrollment_schedule();
