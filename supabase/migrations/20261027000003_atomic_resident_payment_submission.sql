-- Submit a resident payment reference atomically without exposing direct
-- browser writes to the payments table. Callers use this only from a
-- server-side service-role client after verifying the authenticated session.
CREATE OR REPLACE FUNCTION public.submit_document_payment(
  p_user_id uuid,
  p_request_id uuid,
  p_reference_number text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_resident_id uuid;
  v_request public.document_requests%ROWTYPE;
  v_payment_id uuid;
  v_reference text := pg_catalog.btrim(p_reference_number);
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated resident and request are required' USING ERRCODE = '22023';
  END IF;
  IF v_reference IS NULL OR pg_catalog.length(v_reference) < 3 OR pg_catalog.length(v_reference) > 100
     OR v_reference ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Enter a valid payment reference (3-100 characters)' USING ERRCODE = '22023';
  END IF;

  SELECT r.id INTO v_resident_id
    FROM public.residents AS r
    WHERE r.user_id = p_user_id AND r.verification_status = 'Verified'
    FOR UPDATE;
  IF v_resident_id IS NULL THEN
    RAISE EXCEPTION 'Verified resident profile not found' USING ERRCODE = '42501';
  END IF;

  SELECT dr.* INTO v_request
    FROM public.document_requests AS dr
    WHERE dr.id = p_request_id
    FOR UPDATE;
  IF NOT FOUND OR v_request.resident_id IS DISTINCT FROM v_resident_id THEN
    RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.payment_status IN ('Paid', 'Pending') THEN
    RAISE EXCEPTION 'Payment is already %', v_request.payment_status USING ERRCODE = '23505';
  END IF;
  IF COALESCE(v_request.fee_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'This request is free' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payments AS p
    WHERE p.request_id = p_request_id AND p.reference_number = v_reference
  ) THEN
    RAISE EXCEPTION 'This reference number has already been submitted' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.payments(request_id, resident_id, amount, provider, reference_number, status)
    VALUES (p_request_id, v_resident_id, v_request.fee_amount, 'QR_PAY', v_reference, 'Pending')
    RETURNING id INTO v_payment_id;
  UPDATE public.document_requests SET payment_status = 'Pending' WHERE id = p_request_id;
  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_document_payment(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_document_payment(uuid, uuid, text) TO service_role;
