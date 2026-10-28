/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Only rewrite non-auth API calls if BACKEND_API_URL is configured, and never rewrite NextAuth routes
    if (!process.env.BACKEND_API_URL) {
      return [];
    }
    return {
      afterFiles: [
        {
          source: "/api/((?!auth).*)",
          destination: `${process.env.BACKEND_API_URL}/api/:1*`,
        },
      ],
    };
  },
};

export default nextConfig;
