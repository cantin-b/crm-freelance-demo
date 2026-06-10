import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Next.js dev server to accept cross-origin requests from ngrok
  // tunnels (used to preview the app on a phone). Without this, Next 16 blocks
  // /_next dev resources — including the HMR WebSocket — from the tunnel's
  // origin, which breaks client-side hydration (forms/buttons stop working).
  // Dev-only: this restriction does not exist in production builds.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.ngrok.io"],
};

export default nextConfig;
