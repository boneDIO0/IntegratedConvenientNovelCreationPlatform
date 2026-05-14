// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Provider";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🌟 更新成你們專案的名稱
export const metadata: Metadata = {
  title: "Writer's Haven | 整合式小說創作平台",
  description: "A distraction-free writing environment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased` } suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
          <Providers>
          {children}
          </Providers>
        </body>
    </html>
   
  );
}