# Consolidated release work and acceptance gates — 2026-10-24

This branch is one **draft PR** for the barangay system audit. It does not claim complete production readiness.

## Implemented in this PR
- [x] Pre-upload file validation: nonempty files, declared MIME/extension alignment and PDF/PNG/JPEG magic signatures.
- [x] Uploaded file rollback when a subsequent upload or request insert fails (best effort; Storage DELETE policy required).
- [x] Unique unpredictable uploaded object identifiers.
- [x] Regression source checks for these protections.

## Unresolved release blockers (do not deploy)
- [ ] Verify Storage DELETE permission for owner and test rollback with two files and a deliberately failing DB insert.
- [ ] RLS allow/deny tests across anonymous, resident, staff, and privileged users.
- [ ] Review eight anon-callable SECURITY DEFINER functions with caller inventory before altering grants.
- [ ] Reconcile live Supabase migration history with both repository migration roots.
- [ ] Reconcile three residents missing source-linked addresses without fabricating data.
- [ ] Restore-test backups and run payment, document, verification and program E2E tests.
- [ ] Confirm Vercel and Railway environment and deployment health in staging.
- [ ] Require MFA and leak-password protection for privileged administrators.
- [ ] Implement durable distributed API rate limiting.

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
