import type { NextConfig } from "next";

const FASTAPI_DEV_URL = process.env.FASTAPI_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/:path*", destination: `${FASTAPI_DEV_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
