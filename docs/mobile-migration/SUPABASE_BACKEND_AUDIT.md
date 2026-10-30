# Supabase and backend audit

## Configuration and trust boundary
The PWA browser client is initialized in `apps/resident-pwa/lib/supabase/client.ts` through `@supabase/ssr` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Missing URL or the explicit mock flag selects a mock client. The mobile app must use the same project URL and anon/public key via Expo public app configuration; never ship service-role keys. Server-only operations in Next server actions and API routes must remain behind the existing API/server boundary. Existing local `.env` files are not read into this report and values are never copied.

## Authentication/session
The browser uses Supabase Auth `getUser`, `getSession`, `signInWithPassword`, `signOut`; resident-code usernames are transformed into synthetic email addresses in `components/login-form.tsx`. Registration is a server action which creates auth and resident/address records and uploads ID material. Pending-approval screens provide refresh and sign-out. Expo needs SecureStore-backed auth persistence and must preserve the same credentials/auth project. Registration is not a direct client port: keep the server action/API contract or introduce a carefully scoped backend endpoint.

## Discovered data operations
Source scan found resident-facing operations across `announcements`, `residents`, `document_requests`, `document_types`, `barangay_programs`, `program_enrollees`, `notifications`, `push_subscriptions`, `chat_sessions`, `chat_messages`, `ai_audit_logs`, `users`, `addresses`, `household_members`, `documents`, `businesses`, `transactions`, and `barangay_policies`. RPC: `apply_to_barangay_program`. Storage buckets: `document-requirements`, `resident-ids`.

## API and AI
PWA routes include `POST /api/chat` (authenticated/guest chat, rate limits, policy fallback/audit and forwards Supabase access token to the FastAPI `/api/v1/chat` service), `GET /api/policies` (server filesystem policy documents), `POST /api/tts` (server-side Gemini TTS proxy), and `POST /api/notifications/subscribe` (web push). Native push subscription cannot reuse browser Web Push; implement Expo Notifications and a server endpoint with existing authorization semantics. The `/api/policies` filesystem endpoint is deployment-specific and should be replaced with a bundled/read-only policy content strategy or an existing server endpoint for native.

## Realtime and security
Realtime subscriptions refresh resident document requests and public announcements/programs. Queries are scoped by the authenticated user/resident, with RLS expected to remain authoritative. The subscription callback can observe broad table events; mobile should keep equivalent refresh behavior while minimizing sensitive payload handling. Never place OpenAI, Gemini, Supabase service-role, or other server secrets in Expo public configuration.

## Mobile compatibility
Browser session cookies are not a native persistence mechanism; use Expo SecureStore with Supabase JS native auth storage. Server actions are not callable from native; request upload and registration require stable HTTPS API/server endpoints or direct RLS/storage operations backed by existing policies. Browser push, filesystem policy reading, `File`/FormData assumptions and web media capture need native replacements. QR/image capture and speech require Expo native modules; Expo Go availability depends on SDK-compatible modules. No migrations or production data changes were performed.
