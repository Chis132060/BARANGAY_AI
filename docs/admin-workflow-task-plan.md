# Barangay Admin Portal — Remaining workflow tasks

This checklist tracks proposed work; checking an item requires verified implementation and testing. Existing partial implementation: [draft PR #107](https://github.com/Chis132060/BARANGAY_AI/pull/107). PR #105 was already merged.

## Implementation checklist

- [ ] #110 — Resident master identity and duplicate safeguards
- [ ] #111 — Verification queue workflow
- [ ] #112 — Household membership and history
- [ ] #113 — PWD referral and privacy safeguards
- [ ] #114 — 4Ps household verification and referral
- [ ] #115 — Senior citizen OSCA and benefits workflow
- [ ] #116 — Boarder occupancy lifecycle
- [ ] #117 — Programs and councils enrollment workflow
- [ ] #118 — Organization membership and officer terms
- [ ] #119 — Document requests and issuance controls
- [ ] #120 — Community management records
- [ ] #121 — Business registration and renewals
- [ ] #122 — Communications and transactions
- [ ] #123 — Administration security and reporting
- [ ] #124 — Automated tests and CI gates
- [ ] #125 — Security and privacy review
- [ ] #126 — Barangay staff acceptance testing
- [ ] #127 — Production deployment and rollback verification

## Delivery and approval policy

- Keep implementation changes in reviewable PRs, with database migrations and tests when applicable.
- Validate barangay-specific process and eligibility rules with authorized staff; never treat self-report as government certification.
- Verify access controls, Supabase RLS, audit logging, data minimization, and error states before production.
- Run automated checks and manual QA before proposing readiness.
- **Never merge automatically. Only the repository owner or authorized reviewers decide when to merge.**

## Suggested sequence

1. Identity, verification, household, PWD, 4Ps, senior, and documents (#110–#115, #119).
2. Boarders, programs, organizations, community, business, and communications (#116–#118, #120–#122).
3. Administration/security, automated tests, privacy, staff validation, and deployment (#123–#127).

This is a planning-only change, not evidence that these 18 tasks have been implemented.
