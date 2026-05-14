import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authOptions } from "./auth/config";

export const { 
  handlers, 
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  // 🌟 這裡掛上 Adapter，負責「自動註冊」
  adapter: PrismaAdapter(prisma),
  ...authOptions,
});