-- Follow-up to privileged RPC hardening after live advisor review.
-- Idempotent. Do not grant PUBLIC access to SECURITY DEFINER functions.
-- Trigger functions are invoked by PostgreSQL triggers, not directly via REST.
revoke execute on function public.apply_to_barangay_program(uuid) from public, anon;
revoke execute on function public.review_barangay_program_application(uuid, text, text) from public, anon;
revoke execute on function public.has_module_permission(text, text) from public, anon;
revoke execute on function public.is_barangay_staff() from public, anon;
revoke execute on function public.log_program_attendance() from public, anon, authenticated;
revoke execute on function public.log_program_changes() from public, anon, authenticated;
revoke execute on function public.notify_document_request_change() from public, anon, authenticated;
revoke execute on function public.sync_request_transaction() from public, anon, authenticated;
-- Application callers still use the authenticated role for apply/review helpers;
-- trigger functions continue to execute via their installed triggers.
