/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // SW is disabled in dev to avoid stale caching during development.
  // For local Web Push testing, temporarily set this to false and run `npm run build && npm start`.
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
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
