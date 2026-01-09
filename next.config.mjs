import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
  async redirects() {
    return [
      {
        source: "/noel/:slug",
        destination: "/event/:slug",
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Fix for @floating-ui module resolution in Next.js webpack
    // Ensure @floating-ui is properly resolved and bundled
    if (!isServer) {
      // Resolve @floating-ui modules correctly to prevent module resolution issues
      try {
        config.resolve.alias = {
          ...config.resolve.alias,
          "@floating-ui/react-dom": path.resolve(
            process.cwd(),
            "node_modules/@floating-ui/react-dom"
          ),
          "@floating-ui/dom": path.resolve(
            process.cwd(),
            "node_modules/@floating-ui/dom"
          ),
          "@floating-ui/core": path.resolve(
            process.cwd(),
            "node_modules/@floating-ui/core"
          ),
        };
      } catch (e) {
        // If resolve fails, continue without alias
        console.warn("Could not resolve @floating-ui aliases:", e);
      }
    }

    // Ensure proper chunk splitting for @floating-ui
    // Configure cache groups to handle @floating-ui bundling correctly
    if (config.optimization?.splitChunks) {
      const existingCacheGroups = config.optimization.splitChunks.cacheGroups || {};
      config.optimization.splitChunks.cacheGroups = {
        ...existingCacheGroups,
        floatingUI: {
          test: /[\\/]node_modules[\\/]@floating-ui[\\/]/,
          name: "floating-ui",
          chunks: "all",
          priority: 10,
          enforce: true,
        },
      };
    }

    return config;
  },
};

export default withNextIntl(nextConfig);
