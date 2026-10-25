# PWA Offline Implementation — verified status and release gate

Branch: `feat/resident-pwa-offline-cache`

**This branch is NOT certified production-ready.** The following is a source-level implementation summary. GitHub edits are committed, but production bundling, automated test execution, and device/browser offline runs have not been completed as part of these edits.

| Task | Source-level status | Required remaining verification |
| --- | --- | --- |
| T01 Service-worker routing | Implemented configuration | Check generated Workbox routing, fallback precache and install/reload |
| T02 Offline navigation | Partial | Offline cold start and client-side navigation on Android/iOS; network-only navigations fall back to /~offline |
| T03 Account privacy | Partial | Cross-account testing, auth lifecycle, privacy policy for on-device queues |
| T04 Public snapshots | Implemented | Online priming, expired/stale snapshots, no-network launch |
| T05 Request summaries | Implemented minimal user-scoped cache | Sign-out/sign-in privacy regression test, error fallback |
| T06 Outbox durability | Existing queue implementations | Server-side uniqueness constraints, crash/retry/replay testing |
| T07 Foreground synchronization | Implemented triggers and reporting | Network intermittency, dedupe, background limitations |
| T08 Offline sync status | Implemented | Browser interaction tests |
| T09 Forms and server-only features | Partial | All flows incl. payments, chat, attachment-required forms |
| T10 Storage failure and quota | Implemented initial health probe | Eviction, quota exceeded and recovery/migration tests |
| T11 Security review | Partial source audit | RLS and cross-session penetration testing |
| T12 Testing | Source tests added | Run full tests, type-check, production build, Playwright and mobile devices |

## Release commands
From repository root, use the project's package manager to install dependencies, then:

```sh
cd apps/resident-pwa
npm run type-check
npm test
npm run build
npm start
```

Run the production app in an HTTPS testing environment. In DevTools Application, inspect registered worker, Cache Storage, IndexedDB and network responses. Confirm authenticated document and private API responses **never** land in Cache Storage. Prime announcements and requests while connected, disable the network, restart the installed app, and test the offline fallback. Reconnect and check all queued operations get confirmed exactly once. Repeat with resident A then resident B on the same device and ensure B cannot access A's locally saved records. On iOS Safari, test without assuming Background Sync availability.

**Known limitation:** Private authenticated route HTML is intentionally NetworkOnly. An offline cold navigation may show the shared offline fallback rather than the full requested page. Achieving complete route-specific offline cold navigation without leaking private HTML requires a separately packaged public app shell and explicit offline data-driven views; do not promise it based on static asset caching alone.

**Other limitations:** AI inference, online payments, live statuses and push delivery require connectivity. `navigator.onLine` is not a guarantee of reachability. Browser storage is best effort and user-device access remains a privacy concern.
