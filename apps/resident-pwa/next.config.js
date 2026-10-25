/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // SW is disabled in dev to avoid stale caching during development.
  // For local Web Push testing, temporarily set this to false and run `npm run build && npm start`.
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Keep authenticated and dynamic app pages fresh after deploys. The offline
  // document fallback below handles navigation when the network is unavailable.
  cacheStartUrl: false,
  dynamicStartUrl: false,
  cacheOnFrontEndNav: false,
  fallbacks: {
    document: "/~offline",
  },
  // Cache only public, same-origin assets. Authenticated Next.js document/RSC
  // responses and API calls must never be stored across resident sessions.
  // Next.js build assets are content-hashed, so cache-first is safe for them.
  runtimeCaching: [
    {
      urlPattern: ({ url, request }) =>
        url.origin === self.location.origin &&
        url.pathname.startsWith("/_next/static/") &&
        ["script", "style", "font", "worker"].includes(request.destination),
      handler: "CacheFirst",
      options: {
        cacheName: "resident-pwa-build-assets-v1",
        expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [200] },
      },
    },
    {
      urlPattern: ({ url, request }) =>
        url.origin === self.location.origin &&
        request.destination === "image" &&
        (/^\\/(?:icons|onboarding)\\//.test(url.pathname) ||
          ["/logo.png", "/logo-icon.png", "/ate-sora.jpg", "/ate-sora.svg", "/favicon.ico"].includes(url.pathname)),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "resident-pwa-public-media-v1",
        expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [200] },
      },
    },
    {
      // Non-authenticated, explicitly public app assets only.
      urlPattern: ({ url, request }) =>
        url.origin === self.location.origin &&
        request.method === "GET" &&
        ["/manifest.json", "/favicon.ico"].includes(url.pathname),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "resident-pwa-public-metadata-v1",
        expiration: { maxEntries: 8, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [200] },
      },
    },
  ],
  // worker/index.ts is automatically bundled into the generated sw.js by next-pwa.
  // This handles the `push` and `notificationclick` events.
  // customWorkerSrc defaults to "worker" which matches our directory — making this explicit.
  customWorkerSrc: "worker",
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

module.exports = withPWA(nextConfig);
