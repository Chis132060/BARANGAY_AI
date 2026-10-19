# Consolidated BARANGAY_AI release gates

**Correct repository:** Chis132060/BARANGAY_AI. Previous Expo PRs in another repository are not applicable here.

## Existing code audited
- Resident PWA includes 4-step registration, camera capture and Supabase registration server action.
- Registration server action creates an unverified auth user, stores an ID in resident-ids storage, writes user/resident/address records and attempts cleanup on failure.
- Admin portal uses a server-side Supabase RPC for program application review.
- Live Supabase has program apply/review RPCs and staff/resident RLS policies.

## In this PR
- Server-side validation for names, birth date, Philippine phone, email, purok, street, ID type, password length, ID file metadata.
- Node unit tests for normal and malformed input.

## Not yet complete or proven
- Verify real image bytes/magic signatures and dimensions server-side, malware scanning, EXIF stripping, privacy/retention and secure ID download policies.
- Actual Philippine ID OCR and confidence-based classification, with **manual admin verification only**.
- Test all 4 registration steps, camera permissions, file fallback, mobile browsers and interrupted upload cleanup.
- Account recovery end-to-end, durable rate limits and session revocation.
- Verify admin ID-review permissions and audit logs; program review RPC is a different workflow.
- Test RLS with resident, staff and anonymous identities; test concurrent decisions and duplicate applications.
- Run lint, TypeScript, Node tests, both Next.js builds and end-to-end browser tests in CI.
- Confirm Vercel/Railway mappings, environment variables, monitoring and backup recovery.
- Reconcile legacy migration scripts with current live Supabase schema without unreviewed production DDL.

**Do not merge/deploy based solely on this document.** No CI run, real-device QA or production data changes are implied.
