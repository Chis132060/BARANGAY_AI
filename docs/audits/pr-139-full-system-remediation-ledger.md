# Full-system remediation — PR #139 release ledger

**Repository:** `Chis132060/BARANGAY_AI`. One consolidated remediation PR. This ledger is not a claim that all issues have been fixed.

## Confirmed fixes contained in PR #139
- [x] Pending-approval residents can access authenticated support ticket UI without gaining access to verified-only pages.
- [x] FastAPI voice transcription, voice conversation and TTS HTTP routes require a valid Supabase bearer token. PWA voice callers forward the authenticated token.
- [x] Voice conversation forwards the token into chat so ownership is enforced for user sessions.
- [x] FastAPI uses explicit `CORS_ALLOWED_ORIGINS` and no credentialed wildcard access.
- [x] Browser Web Push / API CORS environment examples updated.
- [x] Source regression tests for these authorization boundaries.
- [x] Idempotent SQL migration drafted for privileged RPC direct-execute grants. **Not applied to production**, requires staging checks first.

## P0 release blockers — not verified complete
- [ ] Resident PWA on Vercel Production must match latest merged `main` commit; production was previously behind because of Vercel daily deployment limits.
- [ ] Confirm correct FastAPI hostname, API deployment SHA, `CORS_ALLOWED_ORIGINS`, session JWT authorization and quotas.
- [ ] Apply and test privileged RPC migration on isolated staging database and with anonymous, resident, staff, and administrator clients. Investigate all remaining `SECURITY DEFINER` warnings individually.
- [ ] Confirm no unintended data access to resident IDs, PWD, 4Ps, documents, payment records, support tickets or AI sessions.
- [ ] Verify privileged staff MFA, Supabase leaked-password protection, private storage access and recovery.
- [ ] Verify identity registration, verification, approval/rejection, sensitive record retention and linked address data using authentic records only.
- [ ] Configure browser Web Push VAPID pair and event dispatch. Do not promise device delivery until end-to-end testing passes.
- [ ] Test full support ticket flow on deployed apps: pending resident submission, admin receipt/reply, resident privacy, notification and status.

## P1 — functional completeness (untested until real acceptance cases)
- [ ] Full admin CRUD and negative-authorization tests for Residents / Household / Senior / PWD / 4Ps / Boarders / Organizations.
- [ ] Programs, enrollment slots/eligibility, announcements, transactions, certificates, business permits, document payments and status transitions.
- [ ] Resident account security: MFA, active sessions, session revocation, verified data access and closure handling.
- [ ] Notification categories, persistent preferences, deduplicated event producers, and iOS/Android/browser coverage.
- [ ] Support tickets: spam/abuse prevention, attachment handling, staff assignment and event history.
- [ ] AI: RAG provider failover, auth and budgets, grounding/PII/prompt-injection tests, audio browser fallback.
- [ ] Real API behavior and integrated role-specific E2E browser tests (CI Python syntax alone is not backend testing).

## P2 — operational and quality follow-up
- [ ] Review 8 policy-less RLS tables, 5 mutable search-path functions, pgvector extension schema and schema drift.
- [ ] Profile query plans for 45 unindexed foreign keys, 49 RLS init-plan findings, 37 overlapping permissive policies; changes must be benchmarked.
- [ ] Cross-browser/PWA offline, WCAG accessibility, performance/load tests, observability, backups and restore drill.
- [ ] Update outdated production-readiness claims and technical documentation with verified tests, dates and deployment SHA.

## External dependencies
- **Vercel**: previous Resident deployment blocked by daily deployment quota and missing Preview Supabase variables; do not bypass plan/billing requirements.
- **Railway**: linked-account access error.
- **Render**: workspace selection required; do not select a workspace by guessing.
- **Configuration**: never commit or expose provider credentials, VAPID private keys or service-role keys.

## Release acceptance
1. CI on exact PR head: admin/resident unit tests, TypeScript and production builds, API syntax and relevant behavior tests.
2. Review SQL and stage migration; run RLS allow/deny cases with controlled identities.
3. Validate Preview or staged production deployments of both portals and AI API.
4. Execute authenticated end-to-end test matrix and check admin/staff/resident permissions.
5. Obtain explicit release approval; only then merge and deploy. A green GitHub check is necessary but not sufficient.
