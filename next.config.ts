import type { NextConfig } from "next";
import { withWhopAppConfig } from "@whop/react/next.config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Allow larger body sizes for file uploads (500MB for recordings)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

export default withWhopAppConfig(nextConfig);
