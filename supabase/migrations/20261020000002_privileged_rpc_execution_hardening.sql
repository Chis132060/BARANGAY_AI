-- Emergency access hardening for privileged public RPCs.
-- verify_document_payment previously had no internal auth or authorization check.
-- Preserve its body but restrict execution to the service role until a properly
-- authorized, audited staff payment-verification workflow is implemented.
REVOKE ALL ON FUNCTION public.verify_document_payment(uuid, uuid, character varying, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_document_payment(uuid, uuid, character varying, uuid, text)
  TO service_role;

-- These helpers require a signed-in identity and have no intended anonymous use.
REVOKE EXECUTE ON FUNCTION public.apply_to_barangay_program(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_module_permission(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_barangay_staff() FROM PUBLIC, anon;

-- Trigger functions should not be callable as ordinary RPC endpoints.
REVOKE EXECUTE ON FUNCTION public.notify_document_request_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_request_transaction() FROM PUBLIC, anon, authenticated;
