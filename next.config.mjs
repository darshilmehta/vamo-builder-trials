/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,

  compiler: {
    // Strip all console.* calls in production builds
    removeConsole: process.env.NODE_ENV === "production",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Serve modern formats — AVIF ~50% smaller than WebP, WebP ~30% smaller than JPEG
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    // Tree-shake icon & chart imports — avoids pulling the entire library into the bundle
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  async headers() {
    return [
      {
        // Long-lived immutable cache for hashed static assets
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
