// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config"; 

// 🌟 直接把整包 authOptions 丟進去就好
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };