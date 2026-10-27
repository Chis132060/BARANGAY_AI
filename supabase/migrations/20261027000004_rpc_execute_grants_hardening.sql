-- Follow-up grant hardening. The functions retain their own authorization
-- checks; anon is removed and authenticated callers are explicit where needed.
REVOKE EXECUTE ON FUNCTION public.apply_to_barangay_program(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_to_barangay_program(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_barangay_program_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_barangay_program_application(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_module_permission(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_module_permission(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_barangay_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_barangay_staff() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_household_by_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_household_by_number(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_program_attendance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_program_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_document_request_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_request_transaction() FROM PUBLIC, anon, authenticated;

-- Admin document review reads payment summaries through the payments relation.
-- Resident inserts remain server-only through submit_document_payment().
DROP POLICY IF EXISTS "Authorized staff can view payments" ON public.payments;
CREATE POLICY "Authorized staff can view payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.is_barangay_staff()
    OR public.has_module_permission('documents', 'view')
  );
