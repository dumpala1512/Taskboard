/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Only rewrite /api calls to an external backend if BACKEND_API_URL is explicitly configured (e.g. on Vercel)
    if (!process.env.BACKEND_API_URL) {
      return [];
    }
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.BACKEND_API_URL}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
