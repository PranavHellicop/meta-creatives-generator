import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev indicator so it never leaks into Playwright screenshots of /render.
  devIndicators: false,
};

export default nextConfig;
