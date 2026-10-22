# Full-system audit release gate (PR #136)

This PR is **not complete** until every item below is independently verified. Passing the frontend CI alone does not prove production readiness.

## P0: release blockers
- [ ] Review each Supabase SECURITY DEFINER function, caller grants, ownership checks, and search_path. Supabase advisor flagged 8 anon-executable and 10 authenticated-executable findings; some may be intentional. Do **not** revoke all EXECUTE grants without identifying callers.
- [ ] Fix Barangay AI Vercel project root/build configuration and Supabase build environment. Verify its build independently from admin-portal.
- [ ] Reconcile 3 residents missing linked addresses using real source records; never synthesize personal data.
- [ ] Reconcile live boarders/organizations schemas and three repository migrations against applied migration history on a staging copy before production DDL.
- [ ] Validate RLS allow/deny matrix with authenticated resident, staff, and anonymous sessions; check PWD, 4Ps, verification IDs, organizations and enrollees.

## P1: functional acceptance
- [ ] Resident CSV and XLSX import/export: duplicate handling, audit logging, partial failures, atomicity.
- [ ] Address/purok: registration, staff edit, linked record integrity.
- [ ] Verification queue: pending-only approval/rejection, sidebar counts, notifications and permissions.
- [ ] Households: head/member create/edit/delete; no duplicate assignment; creation works across requests.
- [ ] Senior registry: age 60+ boundary, export and permissions.
- [ ] PWD registry: sensitive fields minimized in API responses; resident/staff access isolation.
- [ ] 4Ps: distinguish self-declaration from officially verified beneficiary status.
- [ ] Boarders and organizations: staff CRUD, policies and existing production data compatibility.
- [ ] Programs and councils: links, eligibility, enrollment, review and permissions.
- [ ] Resident PWA Updates: all tabs, empty states, notifications, offline/reconnect.
- [ ] Document requests, payment status, approval and private attachments: negative authorization tests.

## P2: operational quality
- [ ] Review eight RLS-enabled tables without policies: intended inaccessible tables vs broken features.
- [ ] Review 5 mutable function search paths and pgvector extension placement.
- [ ] Prioritize 44 unindexed foreign keys based on query plans and write load.
- [ ] Optimize 49 RLS initplan findings where function results are row-invariant.
- [ ] Review 36 overlapping permissive-policy warnings for correctness, not just count reduction.
- [ ] Enable/check leaked-password protection and MFA for privileged staff.
- [ ] Add AI services to CI and tests for hallucinations, prompt injection, PII leakage and fallback.
- [ ] Restore-test backups, check error monitoring, rate limiting, accessibility and PWA offline support.

## Verification protocol
1. Keep changes on the same branch/PR; do not merge on green CI alone.
2. Run frontend tests, typechecks, builds, AI tests, and role-specific integration tests.
3. Apply schema migrations only to staging first; verify policy behavior with positive and negative cases.
4. Verify Vercel preview deployments separately for admin, PWA and AI.
5. Perform authenticated smoke tests and obtain explicit production release approval.

## Evidence (2026-10-23)
- Supabase: 52/52 public ordinary tables have RLS enabled; 3 residents lack linked addresses.
- Security advisor: 8 RLS-no-policy, 5 mutable-search-path, 1 public extension, 8 anonymous privileged RPC, 10 authenticated privileged RPC, 1 leaked-password-protection warning.
- Performance advisor: 44 unindexed FKs, 49 RLS initplan, 19 unused indexes, 36 overlapping permissive policies.
- PR #136 CI passed, Admin preview READY, Resident PWA latest preview canceled, Barangay AI preview ERROR due to missing Supabase environment during admin page prerender.
- References: https://supabase.com/docs/guides/database/functions and https://supabase.com/docs/guides/database/postgres/row-level-security
