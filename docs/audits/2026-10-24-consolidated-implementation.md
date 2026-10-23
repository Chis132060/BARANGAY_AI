# Consolidated release work and acceptance gates — 2026-10-24

This branch is a single consolidated PR for the barangay system audit. Regardless of GitHub's draft flag, it does not claim complete production readiness.

## Implemented in this PR
- [x] Pre-upload file validation: nonempty files, declared MIME/extension alignment and PDF/PNG/JPEG magic signatures.
- [x] Uploaded file rollback when a subsequent upload or request insert fails (best effort; Storage DELETE policy required).
- [x] Unique unpredictable uploaded object identifiers.
- [x] Regression source checks for these protections.
- [x] Correct AI database-policy fallback auditRecorded reporting (reflects actual insert result).
- [x] Stop asserting audit success when upstream AI/backend omits audit status.
- [x] Improve published-policy candidate scanning (up to 100, return max 3 matches).
- [x] Add owner-scoped Storage DELETE migration for failed-upload cleanup (NOT APPLIED).

## Unresolved release blockers (do not deploy)
- [ ] Apply Storage DELETE policy migration in staging; test owner/other-user/anonymous DELETE behavior and rollback with two files and failing DB insert.
- [ ] RLS allow/deny tests across anonymous, resident, staff, and privileged users.
- [ ] Review eight anon-callable SECURITY DEFINER functions with caller inventory before altering grants.
- [ ] Reconcile live Supabase migration history with both repository migration roots.
- [ ] Reconcile three residents missing source-linked addresses without fabricating data.
- [ ] Restore-test backups and run payment, document, verification and program E2E tests.
- [ ] Confirm Vercel and Railway environment and deployment health in staging.
- [ ] Require MFA and leak-password protection for privileged administrators.
- [x] Implement database-backed per-user AI rate-limiting code and SQL migration (deployment still blocked until staging tests and migration application).

## Barangay-domain expansion backlog
- [ ] Lupon/Katarungang Pambarangay case registry with confidential access and human jurisdiction review.
- [ ] Ordinance, resolution, and barangay assembly records.
- [ ] Disaster preparedness and evacuation records.
- [ ] Citizen's Charter service catalog, SLA timing and published official fees.
- [ ] Barangay development project and governance reporting.
- [ ] Treasury reconciliation and asset inventory (if included in approved scope).

## Release protocol
1. Verify tests, TypeScript and build for all applications.
2. Compare schema and grants in **staging**; never run unreviewed DDL on production.
3. Validate storage policies and security isolation using multiple real test roles.
4. Obtain barangay staff acceptance and explicit release sign-off.

Observed security findings: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Live access audit evidence (read-only, 2026-10-24)

Supabase project `pedevaqxrudflvostpja` was queried directly for public SECURITY DEFINER EXECUTE grants.

| Function | Anonymous EXECUTE | Current action |
|---|---|---|
| apply_to_barangay_program | Yes | Review user-identity guard; proposed revoke for anon |
| has_module_permission | Yes | Review RLS consumers before changing |
| is_barangay_staff | Yes | Review RLS consumers before changing |
| log_program_attendance | Yes | Trigger function: review direct grants and trigger call |
| log_program_changes | Yes | Trigger function: review direct grants and trigger call |
| notify_document_request_change | Yes | Trigger function: review direct grants and trigger call |
| review_barangay_program_application | Yes | Review role guard; proposed revoke for anon |
| sync_request_transaction | Yes | Trigger function: review direct grants and trigger call |
| verify_document_payment | No | Preserve documented intended grants pending E2E |
| replace_role_permissions | No | Preserve documented intended grants pending E2E |

No production database grant changes were made. Check dependent RPC callers and RLS policies before staging migrations. Supabase database-linter guidance: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Connected hosting inventory
- Vercel projects: `barangay-ai`, `barangay-admin-portal`, `barangay-resident-pwa`.
- Railway project in the barangay link: `unique-passion`.
- These are service discoveries, not successful smoke tests or approved deployment evidence.

## Security acceptance constraints
Do not mark PR fully done until grant changes are simulated against authenticated/unauthenticated roles, backup restoration is proven, all three Vercel builds and Railway services are healthy, and domain-specific barangay modules have staff-approved acceptance tests.

## Shared AI rate limiting (2026-10-24)
- [x] Added atomic per-account Supabase quota RPC with caller identity derived only from `auth.uid()`.
- [x] API blocks anonymous chat until a trustworthy distributed guest-identity quota is provisioned. This is a **functional restriction**, not feature parity: stakeholder review required.
- [x] API fails closed when the quota RPC is unavailable.
- [ ] Apply and test the new migration in staging **before** deploying this branch; otherwise authenticated chat will be rate-limited unavailable.
- [ ] Run concurrency tests (30 accepted requests per 60s, 31st rejected), distinct user tests, expired-window tests and role grants.
- [ ] Decide whether to re-enable guest AI chat using a trusted edge-generated identifier and shared limiter.

**Deployment dependency:** `20261024000002_chat_quota.sql` must be applied to the target environment before the new AI API route is deployed. No live DB migration was applied in this PR.

## Follow-up verified evidence
- [x] GitHub checks on commit `7157e41a9f965adbe1969c6d6778bc9296305735`: seven reported jobs completed successfully.
- [x] Railway linked project `unique-passion` contains production environment and `BARANGAY_AI` service (service discovered; health not verified).
- [x] Vercel `barangay-ai` project exists; queried latest deployment reported `CANCELED` and project `live=false`. Not an available preview/production smoke-test result.
- [ ] Re-run and verify CI for every subsequent commit, not just the previous green SHA.
- [ ] Confirm all three Vercel projects and Railway app health via authenticated staging smoke tests.
- [ ] Obtain barangay-approved definition of done for Lupon, DRRM, legislation and finance: forms, permissions, retention, legal templates and approved office processes. Features without these are not production-complete.

**Production gating decision:** Keep this pull request draft until database migrations and app deployment sequencing are tested together. Green code checks alone are insufficient.

## Latest direct live Supabase inspection
Read-only SQL verified:
- `public.ai_chat_rate_limits` is absent.
- `public.consume_chat_rate_limit(integer,integer)` is absent.
- `storage.objects` has no `Residents can delete their own requirements` policy.

**Deploy blocker:** PR's chat API calls a currently absent RPC. Deploying the PR without safely migrating the target environment would cause authenticated AI chat to return 429/fail closed. Do NOT deploy before verified staging migration and integration test. The migration has not been run on the live project.

**Migration test prerequisites:** obtain approved non-production environment with safe synthetic resident identities, test migration ordering, rate-limiter concurrent RPCs, Storage DELETE owner isolation, then record evidence. Do not use actual resident records to simulate missing addresses.

## Development scope clarification
The governance backlog is not a claim of implemented modules. Production designs require approval of official barangay forms, retention periods, roles, fee ordinances and Citizen's Charter. Running CI does not prove statutory compliance. Do not merge without domain and security acceptance.
