# Resident Settings — Consolidated Implementation and Release Gates

All implementation for Notifications, Privacy & Security, and Help & Support belongs in PR #138. This is a release checklist, not a claim of completion.

## Notifications
- [ ] First-registration / first-login onboarding with an explanatory screen, Enable and Not Now actions; request permission only on a user gesture
- [x] Resident browser push subscription on/off control (requires end-to-end verification)
- [x] Authenticated per-user subscription removal endpoint (requires RLS and browser verification)
- [ ] Notification Center with unread count, history, mark-read, mark-all-read and safe deep links
- [ ] Saved per-user categories: verification, documents, announcements, emergencies, events, support
- [ ] Server-side event producers for registration/approval, document transitions, announcements, emergency alerts, ticket updates
- [ ] Respect opt-out, deduplicate deliveries, keep in-app notifications usable without push permission
- [ ] Verify VAPID configuration and delivery on supported Android/iOS/browser combinations

## Privacy & Security
- [x] Request password-reset email through Supabase Auth (verify redirect allowlist and actual reset completion)
- [x] Persist display name through Supabase Auth (verify validation and profile consistency)
- [ ] Secure password change flow, active sessions, remote sign-out and optional MFA
- [ ] Privacy notice, consent history, verified personal-data access requests
- [ ] Account closure/deletion request with official record-retention review
- [ ] Sensitive action audit logging, secure error handling and backend authorization/RLS regression tests

## Help & Support
- [x] Links to existing AI chat and document request tracking
- [ ] Searchable FAQs, verified office hours/contact details and safe AI handoff
- [ ] Authenticated support tickets with categories, statuses, ownership and anti-spam controls
- [ ] Staff ticket queue, assignment, replies, resolution and resident status notifications
- [ ] Private attachment handling and RLS tests for resident/staff separation

## Release gates — ALL required before merge
- [ ] Migration reviewed and applied in isolated staging; schema grants and RLS verified
- [ ] Automated unit/integration tests for auth, notification preferences, event producers and tickets
- [ ] TypeScript, lint, CI and production build green
- [ ] Real registration -> verification -> first-login onboarding test
- [ ] Real password reset, device push opt-in/out and ticket end-to-end tests
- [ ] Security review for data privacy, unauthorized access, rate limits and retention
- [ ] Mobile accessibility/responsiveness and browser compatibility checks
- [ ] Environment variables verified without exposing secrets
- [ ] Production rollout and smoke tests

Do not mark features complete or merge based only on static UI code.
