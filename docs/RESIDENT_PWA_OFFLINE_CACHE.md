# Resident PWA offline asset caching

This feature adds bounded Workbox runtime caches to the existing Next.js PWA
(`apps/resident-pwa`). It does not add a second service worker or change the
existing IndexedDB outboxes, offline document fallback, or push handlers.

## What is cached

| Cache | Strategy | Limit | Eligible resources |
| --- | --- | --- | --- |
| `resident-pwa-build-assets-v1` | CacheFirst | 120 assets / 30 days | Same-origin `/_next/static/` scripts, styles, fonts, workers |
| `resident-pwa-public-media-v1` | StaleWhileRevalidate | 80 assets / 7 days | Known public branding, icons and onboarding images |
| `resident-pwa-public-metadata-v1` | StaleWhileRevalidate | 8 assets / 1 day | `/manifest.json` and `/favicon.ico` |

Only successful HTTP 200 responses are eligible. Cache entries are populated
when fetched while online. The PWA must be visited online first; the cache
cannot provide an initial install without network access.

## Deliberately not cached

- Authenticated page navigations, RSC/Next data, and server-rendered responses
- `/api/` endpoints, Supabase API data, payment requests, or user uploads
- `/_next/image/` image optimization responses, which could include private images

The existing `/~offline` document fallback and local outbox are still
responsible for offline navigation and user edits. Cache Storage is **not** a
substitute for IndexedDB and it does not synchronize transactions. Browser
storage is best effort and can be cleared by the browser or user.

## Manual verification (production build)

1. Run the resident PWA using a production build; the service worker is intentionally disabled in `next dev`.
2. With DevTools > Application > Service Workers open, visit the app online and wait for the generated worker to control the page.
3. Visit pages that load public icons/images. Check Cache Storage for the three named caches and their eligible entries.
4. Go offline and reload an already-visited page. Static assets should be served from cache; a navigation that cannot load should show `/~offline`.
5. Go online and check that refreshed public images appear after revalidation.
6. Check that no authenticated HTML, API responses, Supabase records, or personal documents exist in any of the three caches.
7. Sign out and sign in with another account. Verify that resident-specific content does not appear from the prior session.

**Note:** The existing Workbox precache/runtime behavior and fallback are
provided by `@ducanh2912/next-pwa`. Confirm the production build and browser
behavior before merging.
