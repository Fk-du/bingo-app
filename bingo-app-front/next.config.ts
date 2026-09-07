import type { NextConfig } from "next";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["magnesium-disinfect-crummy.ngrok-free.dev"],
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${BACKEND_ORIGIN}/api/v1/:path*` },
      { source: "/ws/:path*", destination: `${BACKEND_ORIGIN}/ws/:path*` },
      { source: "/ws", destination: `${BACKEND_ORIGIN}/ws` },
    ];
  },
};
export default nextConfig;
