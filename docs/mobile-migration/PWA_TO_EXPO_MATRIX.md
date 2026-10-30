# PWA to Expo migration matrix

Statuses reflect current absence of `apps/resident-mobile`; no mobile implementation is claimed.

| PWA feature | Source files | Supabase/API | Expo screen | UI parity | Functional parity | Test status |
|---|---|---|---|---|---|---|
| Sign in | `apps/resident-pwa/components/login-form.tsx` | Supabase Auth | `(auth)/login.tsx` | Pending | Pending | Not tested |
| Registration and ID verification | `components/auth/RegisterForm.tsx`; register actions; camera | Supabase Auth, residents, addresses, `resident-ids` | `(auth)/register.tsx` | Pending | Pending | Not tested |
| Approval status | `app/(auth)/pending-approval/*` | resident approval state | `(auth)/pending-approval.tsx` | Pending | Pending | Not tested |
| Dashboard | `app/(app)/home/page.tsx` | announcements, residents, document_requests | `(tabs)/home.tsx` | Pending | Pending | Not tested |
| Request submission and attachments | `app/(app)/requests/new/page.tsx`; actions | document_types, document_requests, `document-requirements` | `requests/new.tsx` | Pending | Pending | Not tested |
| Request tracking, details, payment/QR, realtime | `app/(app)/requests/page.tsx`; payment actions; QRScanner | document_requests, payment verification | `(tabs)/requests.tsx` | Pending | Pending | Not tested |
| AI chat, structured forms, speech | `components/chat/*`; hooks; `/api/chat`, `/api/tts` | chat sessions/messages, AI API and audit | `(tabs)/chat.tsx` | Pending | Pending | Not tested |
| Programs, announcements, applications | `app/(app)/announcements/page.tsx` | announcements, barangay_programs, program_enrollees, RPC | `(tabs)/updates.tsx` | Pending | Pending | Not tested |
| Profile, settings, sign out | `app/(app)/profile/page.tsx` | Supabase Auth; local-only edit in PWA | `(tabs)/profile.tsx` | Pending | Pending | Not tested |
| Onboarding/household | `ResidentOnboardingDialog`; onboarding action | household_members, audit_logs | onboarding flow/modal | Pending | Pending | Not tested |
| Notifications | `useNotifications`, TopBar, subscribe API | notifications, push_subscriptions | notifications screen/native push | Pending | Pending | Not tested |
| Guest access / offline | guest modal; offline page; worker | guest chat and cached web shell | guest chat/native offline state | Pending | Pending | Not tested |
