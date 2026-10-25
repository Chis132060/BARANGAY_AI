# Resident PWA offline implementation — 2026-10-25

## Implemented in this branch
- Durable IndexedDB support-ticket outbox keyed by authenticated user.
- Online and visibility-triggered foreground retries; explicit Sync now.
- Unique client_operation_id migration to make retries duplicate-safe once applied.
- Visible message that local tickets are NOT officially received.
- Source-based regression tests.

## Production blockers
- Apply and verify migration in staging before deploying the frontend. Otherwise inserts using client_operation_id fail.
- This is NOT a complete offline-every-feature implementation.
- IndexedDB is not encrypted by default. Avoid storing highly sensitive support data on shared devices; add secure deletion on sign-out/account change and retention limits before release.
- Offline editing for documents, uploaded blobs, resident profile, programs and payment draft behavior not yet implemented.
- Full multi-tab mutex, network timeouts and mobile/device validation pending.
- Browser background sync may be unavailable; foreground retries are provided but not guaranteed if app is closed.
- Cache strategy currently only supports existing PWA offline fallback; authenticated dynamic data must not be blindly cached.
- No production database changes or deployment in this PR.

## Phased roadmap
1. Account scoped offline storage, cache allowlist, offline UI and lifecycle cleanup.
2. Public announcements and document types cache with expiry and timestamps.
3. Durable outbox with idempotent server mutations and concurrency tests.
4. Document draft, attachment blob storage and safe retryable uploads.
5. Support tickets and program requests after permission and deadline revalidation.
6. Offline read mode for resident dashboard, notifications, and optional private snapshots.
7. Appointment/onboarding drafts, guarded payment behavior and offline FAQ.
8. Privacy controls, storage quotas, browser/device QA, disaster network test and staged rollout.

**Release rule:** Keep as a draft until all affected workflows are integration-tested and critical privacy requirements pass.
