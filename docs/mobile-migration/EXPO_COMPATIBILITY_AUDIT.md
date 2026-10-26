# Expo compatibility audit

The resident PWA currently uses Next.js 14, React 18 and browser-oriented dependencies in `apps/resident-pwa/package.json`. Target is Expo SDK/React Native selected by compatible current Expo package versions; SDK-specific documentation must be consulted before native API implementation.

| Dependency/area | Classification | Mobile treatment |
|---|---|---|
| `@supabase/supabase-js` | Reusable with adaptation | Native auth persistence adapter using Expo SecureStore; same project URL/anon key |
| `@supabase/ssr` | Web/server-only | Do not use in Expo; keep cookies/server actions in PWA/backend |
| React Hook Form, Zod | Reusable with adaptation | Core validation may be reused; use RN controlled inputs and compatible resolver versions |
| `date-fns`, `uuid`, shared types | Directly reusable where imports are platform-neutral | Verify package export/module compatibility |
| Next.js, React DOM, server actions, middleware | Web/server-only | Expo Router screens; retain secure server APIs for privileged operations |
| Tailwind CSS, clsx/tailwind-merge | Web-only or adaptation | Native styling system; carry exact design tokens |
| `lucide-react` | Web-only renderer | Compatible React Native icon package or native vector icons |
| `html5-qrcode`, browser camera | Web-only | Expo Camera / barcode scanning module; verify SDK install and Expo Go support |
| `web-push`, Workbox, PWA worker | Web-only | Expo Notifications and native lifecycle; push setup needs platform credentials and likely development builds |
| `workbox-window`, service worker, manifest | Web-only | No native analogue needed |
| `@openai/agents` server use, `mammoth`, `pdf-parse` | Server-only | Keep AI execution and document parsing behind existing server APIs |
| Browser Web Speech, `MediaRecorder`, `File`, DOM dialogs | Browser-only | Native speech/media/file picker and native modal alternatives; assess modules against Expo Go |

## Blocking compatibility decisions
The current repository had an Expo scaffold in the sibling `BarangayAI/` directory, but the instructed location is `BARANGAY_AI/apps/resident-mobile/`. No SDK package or Expo Router config exists at that instructed location. Native document registration/upload and payment actions depend on Next server actions, so a mobile-safe existing HTTPS endpoint must be identified or designed before parity. Push notifications need platform-specific credentials. These are not verified runtime blockers until an Expo project is created and SDK modules are resolved.

