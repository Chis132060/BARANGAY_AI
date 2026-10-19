-- Replace the vulnerable payment verification RPC with an authenticated staff-only implementation.
-- Explicitly authorize the caller, rather than trusting the caller-supplied p_verified_by.
CREATE OR REPLACE FUNCTION public.verify_document_payment(
  p_payment_id uuid,
  p_request_id uuid,
  p_status character varying,
  p_verified_by uuid,
  p_remarks text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_payment_status text;
  v_resident_id uuid;
  v_final_status text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT r.name INTO v_role FROM public.users u JOIN public.roles r ON r.id=u.role_id WHERE u.id=v_actor;
  IF v_role IS NULL OR v_role NOT IN ('Super Admin','Barangay Captain','Treasurer') THEN
    RAISE EXCEPTION 'Payment verification not permitted' USING ERRCODE='42501';
  END IF;
  IF p_verified_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Verifier identity mismatch' USING ERRCODE='42501';
  END IF;
  IF p_status NOT IN ('Verified','Paid','Rejected') OR p_status IS NULL THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;
  SELECT status INTO v_payment_status FROM public.payments
    WHERE id=p_payment_id AND request_id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment record not found'; END IF;
  IF v_payment_status IN ('Verified','Paid') THEN RAISE EXCEPTION 'Payment already verified or paid'; END IF;
  v_final_status := CASE WHEN p_status IN ('Verified','Paid') THEN 'Paid' ELSE p_status END;
  UPDATE public.payments SET status=p_status, verified_by=v_actor, updated_at=now()
    WHERE id=p_payment_id;
  UPDATE public.document_requests SET payment_status=v_final_status,
    remarks=COALESCE(p_remarks,remarks)
    WHERE id=p_request_id RETURNING resident_id INTO v_resident_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document request not found'; END IF;
  RETURN jsonb_build_object('success',true,'resident_id',v_resident_id,'final_status',v_final_status);
END;
$$;
REVOKE ALL ON FUNCTION public.verify_document_payment(uuid,uuid,character varying,uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_document_payment(uuid,uuid,character varying,uuid,text)
  TO authenticated, service_role;
