import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
const sdkPath = path.resolve(projectRoot, "sdk/src");

const nextConfig: NextConfig = {
  transpilePackages: ["@coral-xyz/anchor", "@solana/spl-token"],

  // Turbopack config (Next.js 16 default)
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      "@sdk/*": [path.resolve(sdkPath, "./*")],
    },
  },

  // Webpack fallback (for `next build --webpack`)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@sdk": sdkPath,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
};

export default nextConfig;
