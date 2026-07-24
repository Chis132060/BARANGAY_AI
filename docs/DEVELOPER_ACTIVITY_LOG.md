# Developer Activity Log

This document records developer actions, current changes, validation status, and follow-up work for the Smart Barangay project.

## 2026-07-22 02:42:45 +08:00

### Developer Task
Admin authentication cleanup and local admin account provisioning.

### Developer Actions Completed
- Removed the public admin signup flow from the admin portal.
- Removed public access to `/signup` from the admin portal middleware.
- Removed the "Create Account" link from the admin login screen.
- Updated the admin login form to accept a username or email.
- Added support for the username `Admin` by mapping it internally to the seeded admin email.
- Added a local-only admin seeder script for creating or updating the admin Supabase Auth account.
- Updated `.gitignore` so `*.local.js` seed files are not pushed to the repository.

### Files Changed
- `apps/admin-portal/components/login-form.tsx`
  - Login field changed from email-only to username-or-email.
  - Username `Admin` maps internally to the admin email used by Supabase Auth.
- `apps/admin-portal/middleware.ts`
  - Public routes are limited to `/login` and `/auth/callback`.
  - `/signup` is no longer treated as a public route.
- `apps/admin-portal/app/(auth)/login/page.tsx`
  - Removed the signup link from the login card.
- `.gitignore`
  - Added `*.local.js` to keep local credential seeders out of pushed repository changes.
- `apps/admin-portal/scratch/seed_admin.local.js`
  - Local-only seeder for the default admin account.
  - Uses `apps/admin-portal/.env.local` for Supabase URL and service key.
  - Creates or updates the admin auth user.
  - Upserts the matching `users` profile with the `Super Admin` role.

### Files Removed
- `apps/admin-portal/components/signup-form.tsx`
- `apps/admin-portal/app/(auth)/signup/page.tsx`

### Database Tables Affected
- Supabase `auth.users`
  - Intended target for the local admin account.
- `roles`
  - Read by the seeder to find the `Super Admin` role ID.
- `users`
  - Upserted by the seeder to connect the Supabase Auth user to the application profile.

### Security Notes
- Public admin self-signup was removed to avoid exposing role assignment in the browser.
- The local admin seeder is intentionally ignored by Git and should stay local only.
- Do not commit passwords, service-role keys, or generated local seed files.
- The admin password is intentionally not written in this documentation.

### Current Validation Status
- Git confirmed `apps/admin-portal/scratch/seed_admin.local.js` is ignored.
- The seeder was attempted locally.
- Initial seeder execution required a WebSocket workaround because the local Node.js runtime is version 20.
- After the workaround, the seeder reached Supabase but failed because the remote database schema cache could not find `public.roles`.

### Current Blocker
The local seeder cannot complete until the Supabase project has the expected `roles` table available in the `public` schema and schema cache.

### Recommended Next Actions
1. Apply or reapply `supabase_schema.sql` to the connected Supabase project.
2. Confirm that `public.roles` and `public.users` exist in Supabase.
3. Refresh Supabase schema cache if needed.
4. Rerun the local admin seeder.
5. Test login using username `Admin`.

### Final Status
Admin public signup is disabled in the application code. Local admin provisioning is prepared but still depends on the Supabase database schema being available.
