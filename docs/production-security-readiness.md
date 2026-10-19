# Production readiness checklist — consolidated security PR

This PR **does not deploy SQL**, configure SMTP, or run real-user acceptance tests. Do not mark the deployment complete just because GitHub reports a merge.

## 1. Critical: payment verification RPC

- Back up the database and test on staging before production.
- Review and apply existing migrations **in order**: `20261020000002_privileged_rpc_execution_hardening.sql`, then `20261020000003_payment_verification_staff_authorization.sql`. Do not deploy the first migration alone: it revokes authenticated execution and may interrupt payment processing.
- Confirm Admin Portal sends the actual authenticated user's UUID as `p_verified_by`; confirm allowed roles and statuses with barangay staff. The payment function currently allows Super Admin, Barangay Captain and Treasurer.
- Verify that an anonymous client cannot call the RPC, an ordinary resident is denied, a staff user can verify a **staging** payment, and mismatched verifier identity is rejected.
- Check live grants (read-only):

```sql
SELECT
  has_function_privilege('anon','public.verify_document_payment(uuid,uuid,character varying,uuid,text)','EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated','public.verify_document_payment(uuid,uuid,character varying,uuid,text)','EXECUTE') AS authenticated_can_execute,
  position('Verifier identity mismatch' in pg_get_functiondef('public.verify_document_payment(uuid,uuid,character varying,uuid,text)'::regprocedure)) > 0 AS identity_guard_installed;
```

Expected: `false, true, true`. These grant checks do not replace end-to-end tests.

## 2. Registration and email verification

- Configure and verify Supabase Auth email confirmation, SMTP provider, sender identity and redirect URL.
- Run a staging signup with a new email, ensure the confirmation email arrives and its link works. Test resend failure behavior, duplicate email, failed ID upload, PNG/JPEG/WebP validation and resident approval.
- `auth.admin.createUser` does not itself send signup confirmation; the server action now requests a confirmation using `auth.resend({type:'signup',email})` and surfaces a warning if that request fails. Confirm provider behavior on staging before production.

## 3. RLS and privileged functions

- Apply `20261020000004_resident_insert_ownership.sql` after staging tests.
- Check that the resident INSERT policy requires `user_id = auth.uid()`; test self-insert and cross-account insert on staging.
- Review the Supabase Security Advisor, especially remaining executable SECURITY DEFINER functions, mutable search paths and tables with RLS but no policies. Some no-policy tables are intentionally inaccessible; do not add blanket policies.
- Review `public.verify_document_payment` and other SECURITY DEFINER functions for least privilege and immutable search paths.

## 4. Admin RBAC

- Sign in as Super Admin/Barangay Captain and save role permissions in staging.
- Attempt the same action as Resident and unauthenticated user; both must fail.
- Confirm the atomic `replace_role_permissions` RPC exists, has no `anon` execute grant and rolls back invalid changes.
- Verify that attempting to change profile email in Admin Portal is blocked pending a coordinated Auth email-change workflow.

## 5. Deployment

- Verify admin portal, resident PWA and API build/test jobs are green. Prior Vercel failures pointed to build-rate limits, not necessarily compilation errors.
- Confirm runtime environment variables, Supabase URL and secret keys are configured server-side, and no service-role key is exposed to the browser.
- Test production health checks and smoke tests without changing real payments or user roles.
- Record reviewer, staging results, migration application timestamp, and deployment URL before closing this checklist.
