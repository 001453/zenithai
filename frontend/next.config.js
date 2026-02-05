/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://backend:8000';
    return [
      { source: '/api/backend/:path*', destination: `${backend}/:path*` },
    ];
  },
};

module.exports = nextConfig;
