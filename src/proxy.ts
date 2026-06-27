import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from "next-auth/jwt";



export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🌟 v4 的標準做法：直接從 Request 中抓取並解密 JWT
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const isLoggedIn = !!token;

  // 1. 定義公開白名單
  const isPublicPage = 
    pathname === '/' || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/api/auth')||
    pathname.startsWith('/api/settings/sync-embeddings');

  // 2. 攔截邏輯
  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/novel_list', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};