/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Admin portal is served under /admin prefix in production
  // basePath: '/admin',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // mammoth uses Node.js built-ins; stub them for the browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
      };
    }
    // pdfjs-dist ships a canvas module that is optional in the browser
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

module.exports = nextConfig;

