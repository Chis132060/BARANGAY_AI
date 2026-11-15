-- Verified registration ID is referenced from an approved resident profile, not re-uploaded.
CREATE OR REPLACE FUNCTION public.guard_verified_resident_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND OLD.user_id = auth.uid()
    AND OLD.verification_status = 'Verified'
    AND NOT public.is_barangay_staff()
    AND (
      NEW.id_type IS DISTINCT FROM OLD.id_type
      OR NEW.id_photo_url IS DISTINCT FROM OLD.id_photo_url
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
    )
  THEN
    RAISE EXCEPTION 'Changing verified registration ID or status requires barangay staff review';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_verified_resident_identity_update ON public.residents;
CREATE TRIGGER guard_verified_resident_identity_update
BEFORE UPDATE ON public.residents FOR EACH ROW
EXECUTE FUNCTION public.guard_verified_resident_identity();

-- Membership applications are kept separate from appointed officers and actual members.
CREATE TABLE IF NOT EXISTS public.organization_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.barangay_organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','Approved','Rejected')),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 500),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,resident_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_unique_linked_resident
 ON public.organization_members(organization_id,resident_id) WHERE resident_id IS NOT NULL;
ALTER TABLE public.organization_join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_join_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.organization_join_requests TO authenticated;

DROP POLICY IF EXISTS "Residents read own organization applications" ON public.organization_join_requests;
CREATE POLICY "Residents read own organization applications"
 ON public.organization_join_requests FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.residents r
  WHERE r.id=resident_id AND r.user_id=(select auth.uid())));

DROP POLICY IF EXISTS "Verified residents apply to active organizations" ON public.organization_join_requests;
CREATE POLICY "Verified residents apply to active organizations"
 ON public.organization_join_requests FOR INSERT TO authenticated
 WITH CHECK (
   status='Pending' AND reviewed_by IS NULL AND reviewed_at IS NULL
   AND EXISTS (SELECT 1 FROM public.residents r
     WHERE r.id=resident_id AND r.user_id=(select auth.uid())
     AND r.verification_status='Verified')
   AND EXISTS (SELECT 1 FROM public.barangay_organizations o
     WHERE o.id=organization_id AND o.status='Active')
 );

DROP POLICY IF EXISTS "Staff review organization applications" ON public.organization_join_requests;
CREATE POLICY "Staff review organization applications"
 ON public.organization_join_requests FOR ALL TO authenticated
 USING (public.is_barangay_staff()) WITH CHECK (public.is_barangay_staff());

-- Only staff approval of an Active organization creates a real membership.
CREATE OR REPLACE FUNCTION public.activate_approved_organization_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO public, pg_temp AS $$
DECLARE resident_record public.residents%ROWTYPE;
BEGIN
 IF NEW.status='Approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
   IF NOT public.is_barangay_staff() THEN
     RAISE EXCEPTION 'Only authorized barangay staff can approve membership';
   END IF;
   IF NOT EXISTS (SELECT 1 FROM public.barangay_organizations
     WHERE id=NEW.organization_id AND status='Active') THEN
     RAISE EXCEPTION 'Organization is not active';
   END IF;
   SELECT * INTO resident_record FROM public.residents WHERE id=NEW.resident_id;
   IF resident_record.id IS NULL OR resident_record.verification_status<>'Verified' THEN
     RAISE EXCEPTION 'Verified resident is required';
   END IF;
   INSERT INTO public.organization_members
      (organization_id,resident_id,full_name,contact_number,role,status,notes)
   VALUES (NEW.organization_id,NEW.resident_id,
      trim(resident_record.first_name||' '||resident_record.last_name),
      resident_record.contact_number,'Member','Active',
      'Joined after staff approval of resident application')
   ON CONFLICT (organization_id,resident_id) WHERE resident_id IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS organization_join_approval ON public.organization_join_requests;
CREATE TRIGGER organization_join_approval
AFTER UPDATE OF status ON public.organization_join_requests
FOR EACH ROW EXECUTE FUNCTION public.activate_approved_organization_membership();
