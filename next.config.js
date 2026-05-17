/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // static export for Cloudflare Pages
  trailingSlash: true,
  images: {
    unoptimized: true,       // required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
