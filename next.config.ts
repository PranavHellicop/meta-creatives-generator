import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The Canva OAuth flow must run on 127.0.0.1 (Canva rejects "localhost" redirect
  // URLs). Allow that origin for the dev server's runtime/HMR so client components
  // hydrate there — otherwise the project page stays stuck on the step tracker.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
