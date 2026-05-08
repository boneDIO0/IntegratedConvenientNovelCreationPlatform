import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcrypt'],
  reactStrictMode: false
  /* config options here */
};

export default nextConfig;
