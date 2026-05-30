import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically - no need for standalone
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-92a3e0fa-95eb-45f1-bcd4-e01d031e946b.space-z.ai",
    ".space-z.ai",
    "localhost",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
};

export default nextConfig;
