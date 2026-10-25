# Offline-first resident PWA: audit and implementation backlog

Target branch: `feat/resident-pwa-offline-cache` (do not merge directly into `main`).
Reference: https://www.gomage.com/blog/pwa-offline/

## Audit summary (code review, not live-device verification)

- **Exists**: Next.js 14 resident PWA, `@ducanh2912/next-pwa`, custom push worker (`worker/index.ts`), offline fallback (`app/~offline/page.tsx`), install manifest, dev-only worker cleanup.
- **Exists**: Workbox asset runtime caching added on this branch in `next.config.js`; needs production-browser verification, especially default navigation behavior.
- **Exists**: IndexedDB public snapshots for announcements/programs/organizations/document types, offline drafts and document outbox, support ticket outbox, program intents, notification read queue.
- **Exists**: `OfflineSyncRunner` retries on mount, online and visibility; no guarantee of background execution when app is closed.
- **Gap**: `app/(app)/requests/page.tsx` reads remote resident request history and on failure only logs; no offline history display. It also shows a hard-coded “Live” indicator.
- **Gap**: `ConnectionBanner` uses `navigator.onLine` which cannot guarantee API/server reachability; does not display per-queue counts or sync outcomes.
- **Risk**: authenticated Next.js pages, Supabase responses, payments and private documents must NOT be put into shared Workbox runtime caches; private data should be account-scoped and cleared on logout.
- **Limitation**: AI chat inference, payments, fresh status, and push delivery require a server/network. Queue or clearly disable unsupported offline actions.

## Tasks, in dependency order

### P0 — Offline bootstrap, navigation and privacy

- [ ] **T01 — Verify and harden service worker routing.** Inspect generated production `sw.js` (not dev mode); confirm pre-cache shell and `/~offline`; ensure `/_next/static/` uses cache-first; public icons and manifest use stale-while-revalidate; authenticated document/RSC navigation, APIs and Supabase endpoints are never runtime cached. Set explicit NetworkOnly routes when plugin defaults need overriding.
  - Done when an installed app opened after a prior online visit shows an offline screen or shell with no uncaught crash; Cache Storage contains no personal JSON/HTML.
- [ ] **T02 — Offline route experience.** Ensure bottom navigation can reach offline-capable routes after starting offline and that unsupported routes show the offline fallback; don't cache user-specific SSR payloads.
  - Done when cold relaunch (after prior online install) and offline navigation work on Chrome Android and Safari iOS supported versions.
- [ ] **T03 — Session and cache privacy audit.** Check auth lifecycle, cross-account sign-out/login, IndexedDB data partitioning by user ID, and local-data purge options. Avoid persisting sensitive personal data without explicit requirements.
  - Done when user B cannot see any data left by user A, including history, drafts, cached pages, and queues.

### P1 — Reliable offline data and synchronization

- [ ] **T04 — Public snapshot offline-first read path.** Load cached announcements, programs, organizations and document types immediately; refresh when online; show source and timestamp; define expiration and stale display semantics. Avoid losing snapshots before reconnection.
  - Done when saved public pages remain readable offline and visually identify stale data.
- [ ] **T05 — Request history offline fallback.** Store only the minimal necessary resident request summary in user-scoped IndexedDB with sensible TTL, preserve last refresh timestamp, and display a stale/offline state; never queue status or payment confirmations as successful.
  - Done when a returning resident can view previously fetched request summaries offline without another resident's information.
- [ ] **T06 — Durable outbox and idempotency review.** Verify support tickets, document requests, program intents and notification reads retain stable operation IDs; inspect server-side dedupe, retry/backoff, permanent-vs-transient error classification and crash/reload durability.
  - Done when repeated retries cannot double-submit a document request, ticket, or application.
- [ ] **T07 — Reliable foreground sync + optional Background Sync.** Trigger sync on startup, browser online, visibility and explicit “Sync now”; probe actual backend reachability (not only `navigator.onLine`); lock concurrent workers; expose retry/needs-attention states. Background Sync only as progressive enhancement.
  - Done when queued operations eventually send after reconnection with app open; closing the app does not misleadingly promise guaranteed delivery.
- [ ] **T08 — Offline status center.** Show online/connection-unavailable, pending counts by queue, last sync attempt, success/failure, retry button, and “saved locally vs received by barangay” wording.
  - Done when users cannot mistake a queued operation for a confirmed server submission.

### P2 — Feature-specific usability and resilience

- [ ] **T09 — Forms and chat degradation.** Preserve offline document form drafts; explicitly disable network-only AI inference, login, payments and QR/payment verification while offline; keep readable local informational guidance.
  - Done when attempts during outages produce actionable messages and no false success.
- [ ] **T10 — Storage and lifecycle.** Handle quota exceeded, IndexedDB unavailable/private browsing, storage eviction, cache version cleanup, app updates, migrations, stale chunks and offline-before-install behavior.
  - Done when failed storage is visible and recoverable instead of silently reporting saved.
- [ ] **T11 — Security review.** Test logged-out and account-switch behavior, Supabase row-level policies, cache poisoning, private images, expired sessions, malicious retries and accessibility of offline controls.
  - Done when no sensitive private response enters shared Cache Storage or another account's local view.
- [ ] **T12 — Automated and device tests.** Add tests for cache URL allowlist, sync retries/idempotency, offline navigation, request-history user scoping and storage failures. Run `npm run build`, `npm run type-check`, and resident tests; run browser airplane-mode matrix including slow, flaky and restored connections.
  - Done when checks pass in production mode on representative desktop/Android/iOS devices.

## Delivery milestones

1. **M1 — Safe launch offline:** T01–T03, T10. Deliver working shell/fallback, static caches, and privacy boundaries.
2. **M2 — Offline browsing:** T04–T05. Deliver cached public content and account-scoped last-known request summaries.
3. **M3 — Offline submissions:** T06–T09. Deliver durable outboxes, explicit status and reliable on-reconnect behavior.
4. **M4 — Verification/release:** T11–T12. Test production bundle, offline scenarios and release checklist.

## Offline acceptance matrix

| Flow | Offline expected result | Online after reconnect |
| --- | --- | --- |
| Open installed app | Cached shell or offline fallback | Refreshes current bundle |
| Browse announcements/programs | Last saved public snapshot with timestamp | Revalidates |
| View own requests | Previously saved minimal summary, marked stale | Updates from server |
| Draft document request | Saved locally with confirmed storage result | Still available |
| Submit supported offline request | Queued locally, clearly *not submitted* | At most one server request created |
| Join program | Queued intent, no reserved slot promised | Server validates eligibility/deadline |
| Support ticket | Stored in local outbox | Server confirms or error shown |
| AI chat | Clearly unavailable (unless a separate verified local mode exists) | Normal chat |
| Payment | Blocked, no false payment status | Normal server-side verification |
| Change accounts | Previous user's offline data inaccessible | Correct new user context |

## Verification limits

This is a source-code audit and planned work, **not** proof of end-to-end offline functionality. A production build and real browser tests have not been run in this audit. The GoMage article describes caching strategies, service workers and IndexedDB but does not solve authentication, retry idempotency, or privacy requirements by itself.
