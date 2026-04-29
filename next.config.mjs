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
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      // Bumped for purchase-proof uploads (PDF/image, max 5MB enforced in the
      // action). The 2MB default would reject most phone screenshots.
      bodySizeLimit: "6mb",
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
  async headers() {
    // Headers globaux à faible risque de régression : XFO/Referrer/HSTS
    // /Permissions/X-Content-Type. Une CSP stricte est volontairement
    // omise — elle nécessite un round-trip de tests (Umami, Vercel
    // Analytics, blob storage, framer-motion, fonts.googleapis) et sera
    // ajoutée dans un PR dédié en mode report-only d'abord.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
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
          "@floating-ui/dom": path.resolve(process.cwd(), "node_modules/@floating-ui/dom"),
          "@floating-ui/core": path.resolve(process.cwd(), "node_modules/@floating-ui/core"),
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
