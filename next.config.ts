import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcrypt'],
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com', // 👈 把 ** 改成單一個 *
        port: '',
      },
      {
        // 📍 新增：允許 Google 登入的大頭貼
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
      },
      {
        // 📍 新增：允許 GitHub 登入的大頭貼 (預防萬一)
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
      }
    ],
  },
};

export default nextConfig;