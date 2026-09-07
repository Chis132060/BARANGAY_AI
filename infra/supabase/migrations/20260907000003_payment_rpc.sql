-- Phase 2 Migration: Payment Verification RPC
-- Ensures transactional consistency between payments and document_requests tables

CREATE OR REPLACE FUNCTION verify_document_payment(
    p_payment_id UUID,
    p_request_id UUID,
    p_status VARCHAR,
    p_verified_by UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_payment_record RECORD;
    v_doc_req_record RECORD;
    v_final_status VARCHAR;
    v_resident_user_id UUID;
    v_doc_name VARCHAR;
BEGIN
    -- 1. Lock and get the payment record
    SELECT * INTO v_payment_record 
    FROM payments 
    WHERE id = p_payment_id AND request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found.';
    END IF;

    IF v_payment_record.status IN ('Verified', 'Paid') THEN
        RAISE EXCEPTION 'Payment is already verified or paid.';
    END IF;

    -- Map 'Verified' or 'Paid' payment status to document_requests payment_status
    v_final_status := CASE WHEN p_status IN ('Verified', 'Paid') THEN 'Paid' ELSE p_status END;

    -- 2. Update the payments table
    UPDATE payments
    SET status = p_status,
        verified_by = p_verified_by,
        updated_at = now()
    WHERE id = p_payment_id;

    -- 3. Update the document_requests table
    UPDATE document_requests
    SET payment_status = v_final_status,
        remarks = COALESCE(p_remarks, remarks)
    WHERE id = p_request_id
    RETURNING resident_id, document_type_id INTO v_doc_req_record;

    -- Return success and some metadata for notification
    RETURN json_build_object(
        'success', true,
        'resident_id', v_doc_req_record.resident_id,
        'final_status', v_final_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
