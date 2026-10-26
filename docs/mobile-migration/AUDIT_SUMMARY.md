# Barangay AI resident PWA audit and Expo replication

## Scope and source of truth
This is a static audit of `BARANGAY_AI/apps/resident-pwa`, root workspace manifests, selected backend/AI source and Supabase migrations. Existing PWA files were read only. No Supabase mutation, migration, credential output, runtime test or visual comparison was performed.

## Counts observed
- PWA source/asset/config/test files: **88** (`rg --files apps/resident-pwa`; generated folders excluded).
- App Router routes: **11** including offline route (root, auth login/register/pending approval, dashboard, requests/list/new, chat, announcements, profile, offline). API routes include chat, policies, TTS, notifications subscribe, and auth callback; route handlers are listed in the manifest.
- Reusable components: **14** under `components/` by file inventory (client components, shared layouts, chat, auth, camera, payment and onboarding).
- Hooks: **3**; library/service modules: **11** under `lib/`. Counts are file categories, not export/function counts.
- Resident workflows mapped: **12** (including auth, onboarding, notifications and offline/guest paths).
- Supabase integration points: 18 table names observed plus one RPC and two storage bucket names; see backend audit.
- Backend HTTP endpoint families directly called: `/api/chat`, `/api/tts`, `/api/notifications/subscribe`, and FastAPI `/api/v1/chat`; `/api/policies` is consumed by chat.
- Confirmed runtime Expo blockers: **0 tested**; unresolved design/prerequisite issues: native endpoint contracts for server actions, push credentials, and Expo project/SDK setup.

## Findings
PWA source uses blue primary `#2563eb`, light blue `#3b82f6`, slate page background and Inter. Requests and announcements use Realtime refresh. Document requests require server-action uploads to `document-requirements`. Registration is a server action with ID capture and resident-ID storage. Chat retains backend service credentials on the server. Profile editing is local-only in the PWA and household details are currently hard-coded; the native replication should not describe these as persisted.

## Safety and environment
Baseline reported before work: branch `main`, HEAD `19a5aabc7120be1febf278961cd58b1122152115`, existing modified root `package-lock.json`. Branch creation was denied because `.git` is not writable and is owned by another Windows identity. PWA tree was not changed by these actions. Project-root directory writes were denied from project-root execution, while parent-workspace writes succeeded. All audit artifacts are in the requested project paths where parent-root access permitted. Existing environment files were not read for values or copied.

## Completion gate
The audit/mapping artifacts are generated; the audit is static and not a complete line-by-line behavioral verification for each of 88 files. No Expo implementation could be written or run because `BARANGAY_AI/apps` is outside the effective writable root when invoked at project root, despite the parent workspace granting writes elsewhere. Therefore the requested implementation, builds, end-to-end tests and PWA regression verification remain incomplete. The feature parity report records the missing work.

See `PWA_FILE_INVENTORY.md`, `PWA_FEATURE_AUDIT.md`, `SUPABASE_BACKEND_AUDIT.md`, `PWA_UI_DESIGN_AUDIT.md`, `EXPO_COMPATIBILITY_AUDIT.md`, `PWA_TO_EXPO_MATRIX.md`, and `FEATURE_PARITY_REPORT.md`.
