-- Prevent resident-owned rows from changing fields that require staff review.
-- The guards run at the database boundary, so direct Data API writes and
-- application requests receive the same protection. Service-role workflows
-- remain available for reviewed administrative operations.

CREATE OR REPLACE FUNCTION public.guard_resident_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_barangay_staff() THEN
    IF NEW.birth_date IS DISTINCT FROM OLD.birth_date
      OR NEW.gender IS DISTINCT FROM OLD.gender
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.resident_code IS DISTINCT FROM OLD.resident_code
      OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Sensitive resident fields can only be changed by authorized staff.' USING ERRCODE = '42501';
    END IF;
    IF (NEW.voter_status IS DISTINCT FROM OLD.voter_status
      OR NEW.senior_status IS DISTINCT FROM OLD.senior_status
      OR NEW.pwd_status IS DISTINCT FROM OLD.pwd_status
      OR NEW.four_ps_status IS DISTINCT FROM OLD.four_ps_status)
      AND NOT (NOT OLD.household_onboarding_completed AND NEW.household_onboarding_completed) THEN
      RAISE EXCEPTION 'Benefit eligibility claims can only be submitted once during resident onboarding.' USING ERRCODE = '42501';
    END IF;
    IF NEW.solo_parent_status IS DISTINCT FROM OLD.solo_parent_status
      OR NEW.dswd_status IS DISTINCT FROM OLD.dswd_status THEN
      RAISE EXCEPTION 'Benefit eligibility records can only be changed by authorized staff.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_resident_sensitive_fields ON public.residents;
CREATE TRIGGER guard_resident_sensitive_fields
  BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.guard_resident_sensitive_fields();

CREATE OR REPLACE FUNCTION public.guard_resident_document_request_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_document_name text;
  v_authoritative_fee numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_barangay_staff() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'Pending'
        OR NEW.resident_id NOT IN (
          SELECT id FROM public.residents
          WHERE user_id = auth.uid() AND verification_status = 'Verified'
        ) THEN
        RAISE EXCEPTION 'Residents may only submit a pending request for their own verified profile.' USING ERRCODE = '42501';
      END IF;
      SELECT lower(name) INTO v_document_name
        FROM public.document_types WHERE id = NEW.document_type_id;
      v_authoritative_fee := CASE v_document_name
        WHEN 'barangay clearance' THEN 50
        WHEN 'certificate of indigency' THEN 0
        WHEN 'certificate of residency' THEN 30
        WHEN 'business clearance' THEN 500
        ELSE NULL
      END;
      IF v_authoritative_fee IS NULL THEN
        RAISE EXCEPTION 'This document type is not available for resident self-service.' USING ERRCODE = '42501';
      END IF;
      NEW.fee_amount := v_authoritative_fee;
      NEW.payment_status := CASE WHEN v_authoritative_fee = 0 THEN 'Free' ELSE 'Unpaid' END;
      NEW.status := 'Pending';
      IF NEW.transaction_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.request_transactions rt
        WHERE rt.id = NEW.transaction_id AND rt.user_id = auth.uid()
      ) THEN
        RAISE EXCEPTION 'Request transaction does not belong to the signed-in resident.' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.fee_amount IS DISTINCT FROM OLD.fee_amount
      OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
      OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id THEN
      RAISE EXCEPTION 'Document fees, payment, status, and ownership are controlled by the barangay.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_resident_document_request_fields ON public.document_requests;
CREATE TRIGGER guard_resident_document_request_fields
  BEFORE INSERT OR UPDATE ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_resident_document_request_fields();

CREATE OR REPLACE FUNCTION public.guard_household_membership_move()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_barangay_staff()
    AND (NEW.household_id IS DISTINCT FROM OLD.household_id
      OR NEW.resident_id IS DISTINCT FROM OLD.resident_id) THEN
    RAISE EXCEPTION 'Only authorized staff can move a household membership.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_household_membership_move ON public.household_members;
CREATE TRIGGER guard_household_membership_move
  BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_household_membership_move();

CREATE OR REPLACE FUNCTION public.guard_business_owner_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_barangay_staff() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'Pending';
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Business status can only be changed by authorized staff.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_business_owner_status ON public.businesses;
CREATE TRIGGER guard_business_owner_status
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_owner_status();

-- These trigger functions are implementation details, not callable RPCs.
REVOKE ALL ON FUNCTION public.guard_resident_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_resident_document_request_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_household_membership_move() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_business_owner_status() FROM PUBLIC, anon, authenticated;

