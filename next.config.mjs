/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/noel/:slug',
        destination: '/event/:slug',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
