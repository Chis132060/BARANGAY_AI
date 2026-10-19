# Correct-repository audit and consolidated program review fix

Repository: `Chis132060/BARANGAY_AI` (Next.js monorepo). This is the repository connected to the three Vercel projects. The earlier Expo-based `donnelsimbajon-design/Barangay-Sigurado` sprint PRs were made in the wrong repository and must not be used as evidence of implementation here.

## Verified existing features on main
- Resident registration already has a four-step `RegisterForm`, browser `CameraCapture`, and server action. Do not replace these with the Expo scaffolds.
- Admin portal has program publishing and enrollee management.
- Resident announcements page has cached/realtime program listing.
- Sidebar JSX is syntactically structured in current main; old build logs do not prove a current failure.

## Changes in this PR
- Restore resident Join Program and existing-application status while preserving the current announcements refresh logic.
- Restore admin pending application Approve/Reject controls, loading effect, and server action; block duplicate clicks.
- This is a replacement for conflicting PR #71, not a second copy of the earlier wrong-repository PRs.

## Mandatory release gates (not yet verified)
- Confirm the actual deployment database includes `apply_to_barangay_program(uuid)` RPC with authenticated-only execution and ownership checks.
- Confirm `program_enrollees.status` accepts Pending/Approved/Rejected. The older migration `20261001_boarders_programs.sql` restricts status to Active/Inactive; running against that schema will fail. Resolve via reviewed migration, **not** unreviewed live SQL.
- Verify staff-only UPDATE policy and resident-scoped SELECT policy. The older migration grants all authenticated users SELECT on all enrollees, exposing resident data; tighten RLS before production.
- Test resident join/repeat attempts, staff approve/reject, unauthorized users, concurrent decisions, and build both Next.js apps.
- Vercel deployment quota may prevent automatic preview builds; verify after reset.

No production database, deployment, or secrets were changed. No tests were executed in this PR creation step.
