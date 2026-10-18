import type { NextConfig } from "next";

// Browser calls /api/* on the same origin; Next proxies to FastAPI (no CORS needed).
const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL ?? "http://localhost:8046"}/api/:path*` }];
  },
};

export default nextConfig;
