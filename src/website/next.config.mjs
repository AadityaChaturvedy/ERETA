/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Keep other experimental flags if present; we only add optimizeCss here
    optimizeCss: false,
  },
}

export default nextConfig
