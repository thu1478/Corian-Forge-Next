/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
    output: 'export',
    basePath: "/Corian-Forge-Next"
}

export default nextConfig
