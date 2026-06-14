import type { NextConfig } from "next";

const FASTAPI_DEV_URL = process.env.FASTAPI_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next doesn't infer it from a stray lockfile
  // outside the project (e.g. ~/package-lock.json).
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/:path*", destination: `${FASTAPI_DEV_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
