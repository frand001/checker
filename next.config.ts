import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // We handle type checking in our CI process
    ignoreBuildErrors: true,
  },
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: true,
  },
  // Configure webpack to handle browser-only APIs
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Polyfill or avoid browser-only modules on the server
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
