# UI and design audit

Source inspected: `apps/resident-pwa/app/globals.css`, route pages and shared layout components. A running visual comparison was not performed, so pixel-level parity is not claimed.

## Tokens and typography
Primary brand `#2563eb`; light primary `#3b82f6`; page background `#f8fafc`; default text `#0f172a`; Inter web font with system fallback. Bottom navigation height is 64px. Cards generally use white backgrounds, blue/gray subtle borders, rounded-xl/2xl corners, compact 10–14px labels/body and 18–24px headings.

## Layout and controls
Resident shell uses TopBar and BottomNav; mobile-first single-column content with 16px padding and bottom clearance for 64px navigation. Dashboard quick actions use a two-column grid, blue gradient greeting, compact advisory and request cards. Auth screens center a narrow max-width card and include logo and guest assistant entry. Requests use horizontally scrollable filter chips, status badges, detail/payment dialogs and QR scanning. Updates uses Programs/Announcements tabs, category chips and enrollment cards. Profile uses avatar, household card, menu rows and edit/information dialogs.

## Interaction states
Pages implement loading spinners/text, empty dashed cards, inline error banners, success notices, confirmation states and disabled submit controls. Requests and updates subscribe to Supabase Realtime. Onboarding, registration, payment and request submission expose multi-step/forms and errors. Transitions are mostly short CSS hover/fade states; map to native press feedback and modal transitions.

## Assets and responsive behavior
PWA logos, Ate Sora imagery, onboarding photos, icons and manifest live under `apps/resident-pwa/public`. Expo should copy selected assets into its own app assets; do not import the PWA filesystem at runtime. Native safe-area insets replace CSS `env(safe-area-inset-*)`. Tailwind and lucide-react are web-only renderers; preserve sizing/colors using RN styles and a compatible icon package. Web breakpoints should collapse naturally to the existing narrow mobile layout.

## Visual verification
No emulator/simulator screenshot or live PWA comparison was captured. UI audit is source-based only.
