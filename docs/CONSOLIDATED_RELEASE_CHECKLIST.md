# Consolidated release checklist (Admin Portal + Resident PWA)

This document tracks **verification requirements**, not a claim that the platform is fully production-ready.

## Automated checks (required before merge)

- GitHub Actions `Portal quality gates`: both app regression tests, TypeScript checks and builds must pass.
- Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as repository Actions secrets when the build requires them. Never commit production secrets.
- Confirm the workflow runs successfully on this PR. A workflow file alone does not prove the build passes.

## Database and authorization

- Review and apply merged migration `supabase/migrations/20261020000003_verification_updates_query_indexes.sql` through the approved Supabase migration process. **Git merge does not apply SQL.**
- Check `pg_indexes` and compare `EXPLAIN (ANALYZE, BUFFERS)` for verification and Updates queries on representative staging data.
- Review effective RLS policies for `residents`, `addresses`, `program_enrollees`, `announcements`, `barangay_programs`, and `storage.objects`; confirm migration history matches the deployed database.
- As a non-admin resident, confirm that other residents' identity documents, addresses and enrollment records cannot be read.
- As a staff reviewer, verify pending-only approval/rejection, audit records and notification delivery.

## Authenticated browser acceptance

- Admin: open Verification Queue, inspect ID, approve one test resident, reject another with a reason; verify stale or already-reviewed records cannot be acted on again.
- PWA: load Updates on a slow connection, change announcements/programs in a second session, refresh repeatedly, apply to a program and verify the application state.
- Measure navigation and query latency (p50/p95), inspect network waterfalls and Supabase query plans, and document results before claiming performance gains.
- Exercise registration, certificate/request workflows, notification permissions, AI assistant grounding and reporting exports separately; those modules are **not certified** by these regression tests.

## Deployment and rollback

- Confirm the latest main SHA is present in **both** Vercel production deployments, not merely that a previous deployment is READY.
- Review failed builds and function logs, verify environment variables, then perform authenticated smoke tests.
- If deployment fails, roll back the affected Vercel project to its previous known-good deployment. Database migration rollback needs an explicit reviewed migration; do not drop indexes or change RLS blindly.
- Track outstanding failures and assign owners before production sign-off.
