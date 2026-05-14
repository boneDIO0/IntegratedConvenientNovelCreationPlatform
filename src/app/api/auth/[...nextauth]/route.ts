import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth/config"; // 🌟 確保名稱對上

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authOptions,
});

export { handler as GET, handler as POST };