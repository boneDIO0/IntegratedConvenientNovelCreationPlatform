// src/lib/auth/config.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter"; // 🌟 引入 PrismaAdapter
import { prisma } from "@/lib/prisma"; // 🌟 引入你的 Prisma 實例 (請確認路徑正確，如果 export 方式不同請加花括號 { prisma })

export const authOptions: NextAuthOptions = {
  // 🌟 關鍵：把 Prisma Adapter 接上 NextAuth，讓系統知道要去哪裡找/存使用者
  adapter: PrismaAdapter(prisma), 
  
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt", 
  },
  secret: process.env.NEXTAUTH_SECRET, // v4 建議在 options 裡也明確傳入
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};