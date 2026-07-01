import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@paybook/db'],
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
}

export default nextConfig
