/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
    output: 'export',
    basePath: "/Corian-Forge-Next",
    async redirects() {
        return [
            {
                source: '/',
                destination: '/Corian-Forge-Next',
                basePath: false, // This is key! It tells Next not to double-prefix
                permanent: false,
            },
        ];
    },
}

export default nextConfig
