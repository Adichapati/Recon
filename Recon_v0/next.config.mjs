/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: process.env.NODE_ENV === "production",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },

  async rewrites() {
    return [
      // ✅ Let NextAuth handle auth routes
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },

      // ✅ Proxy all other API routes to backend
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ]
  },
}

export default nextConfig
