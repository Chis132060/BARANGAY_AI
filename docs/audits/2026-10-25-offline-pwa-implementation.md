# Resident PWA offline implementation — 2026-10-25

## Implemented in this branch
- Durable IndexedDB support-ticket outbox keyed by authenticated user.
- Owner-scoped document request form drafts (without sensitive file blobs); manual upload required when online.
- Allowlisted expiring public IndexedDB snapshots for document catalogs, published announcements, programs and organizations.
- Authenticated-shell offline connectivity status banner.
- Explicit user confirmation and local draft/outbox purge before sign-out.
- Online and visibility-triggered foreground retries; explicit Sync now.
- Unique client_operation_id migration to make retries duplicate-safe once applied.
- Visible message that local tickets are NOT officially received.
- Source-based regression tests.

## Production blockers
- Apply and verify migration in staging before deploying the frontend. Otherwise inserts using client_operation_id fail.
- This is NOT a complete offline-every-feature implementation.
- IndexedDB is not encrypted by default. Avoid storing highly sensitive support data on shared devices; add secure deletion on sign-out/account change and retention limits before release.
- Document text drafts are implemented; offline attachments, verified document submission, resident profile, programs and payment workflows are not yet implemented.
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

## CI diagnostics
Previous resident unit-test failures included an outdated test asserting the ticket page inserted directly via Supabase Auth. The implementation now sends tickets from an authenticated outbox, so the test was updated to inspect the outbox identity/owner checks. CI still needs a fresh green run.

## Further committed components
- [x] Persist and expire public announcements, organizations, and program catalogs in IndexedDB. Fetch errors can display clearly labeled cached public content.
- [x] Offline AI sends no network request and returns an explicit non-live reference message; official advice must be refreshed online.
- [x] Save, restore and remove user-scoped document request text drafts; attachments are deliberately **not** stored in browser offline databases.
- [x] Confirm and delete private support/document drafts on sign-out.
- [x] Detect offline state in the authenticated app layout.

## Explicit limitations
- **Offline support-ticket queuing requires the idempotency SQL migration BEFORE frontend deployment.**
- The first online fetch is needed to populate public snapshots; expiry currently ranges from one hour for announcements/programs to 24 hours for document types.
- Cached announcements and program listings are reference-only; program registration availability remains server authoritative.
- No claim of automatic server submission for document requests: these remain local drafts and require user action plus new attachments after reconnection.
- No offline private notification history, payment capture, or appointment booking is enabled, to avoid false confirmed states.
- Next.js routing/browser cache behavior and iOS PWA lifecycle remain unverified in real devices.
- Automated tests include source contract checks, not authenticated real-device integration tests.

## Additional verified code scope
- [x] Shared foreground sync runner in authenticated app shell on app-open, reconnect and visibility restoration. Global event refreshes support history.
- [x] Separate account-scoped IndexedDB outbox for notification read acknowledgements; server action is idempotent `read_status=true` scoped by authenticated `user_id`.
- [x] Clear support queue, document drafts and notification acknowledgements at logout, with confirmation for unsent documents and tickets.
- [ ] Do NOT merge until CI is green on the latest commit and end-to-end multi-account tests are done.
- [ ] Background sync when app is closed is not guaranteed; mobile foreground retry is the supported fallback.
- [ ] Data-at-rest encryption, quota/expiry policy, browser compatibility and crash recovery need privacy approval and tests.
