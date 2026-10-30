# Resident PWA feature audit

Routes and workflows are derived from the App Router and interactive source; route groups are omitted from URLs.

| Feature | Route | Source files | Backend/API | Mobile plan |
|---|---|---|---|---|
| Sign in and guest chat | `/login` | `components/login-form.tsx; app/(auth)/login/page.tsx` | Supabase Auth password; guest chat | Expo screen/workflow; pending |
| Resident registration and ID verification | `/register` | `components/auth/RegisterForm.tsx; register/actions.ts; CameraCapture` | Server action, Supabase Auth, resident data and ID storage | Expo screen/workflow; pending |
| Pending approval status | `/pending-approval` | `app/(auth)/pending-approval/*` | Supabase resident approval state | Expo screen/workflow; pending |
| Resident dashboard | `/home` | `app/(app)/home/page.tsx` | Auth user, announcements, residents, document_requests | Expo screen/workflow; pending |
| Document request tracking, payment and QR | `/requests` | `app/(app)/requests/page.tsx; payment-actions.ts; QRScanner` | document_requests, realtime, payment verification action | Expo screen/workflow; pending |
| New document request and attachments | `/requests/new` | `app/(app)/requests/new/page.tsx; requests/actions.ts` | document_types, resident ownership, server-side uploads | Expo screen/workflow; pending |
| Ate Sora AI assistant | `/chat` | `components/chat/*; hooks/useTTS.ts; hooks/useSTT.ts; lib/ai/*` | POST /api/chat, /api/policies, /api/tts; AI backend | Expo screen/workflow; pending |
| Announcements, programs and enrollment | `/announcements` | `app/(app)/announcements/page.tsx` | announcements, barangay_programs, program_enrollees, RPC apply_to_barangay_program, realtime | Expo screen/workflow; pending |
| Profile, settings and sign out | `/profile` | `app/(app)/profile/page.tsx` | Supabase Auth; profile edit is currently local-only | Expo screen/workflow; pending |
| Offline fallback | `/~offline` | `app/~offline/page.tsx; worker/index.ts` | PWA service worker only | Expo screen/workflow; pending |
