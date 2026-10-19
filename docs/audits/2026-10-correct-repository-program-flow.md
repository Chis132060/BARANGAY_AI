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
- **Live database inspected:** `apply_to_barangay_program(uuid)` exists and checks `auth.uid()`, verified resident, and public active program. Verify its EXECUTE grants and duplicate behavior before release.
- **Live database inspected:** `program_enrollees.status` is `text` without the old Active/Inactive CHECK constraint; however the checked-in `20261001_boarders_programs.sql` still defines that old constraint. Align migration history for fresh installs, without blindly reapplying the old migration to production.
- **Live database inspected:** policies include `Staff read enrollees`, `Staff manage enrollees`, and `Residents read own applications`. The checked-in old migration instead grants all authenticated users SELECT. Preserve the live policy model and add a safe migration for fresh installs.
- Test resident join/repeat attempts, staff approve/reject, unauthorized users, concurrent decisions, and build both Next.js apps. The live RPC currently uses an `ON CONFLICT ... DO UPDATE SET id=id` no-op; it may return success for duplicate applications, so the UI must check existing state and server logic should eventually make repeat submissions explicit.
- Vercel deployment quota may prevent automatic preview builds; verify after reset.

No production database, deployment, or secrets were changed. No tests were executed in this PR creation step.
