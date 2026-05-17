// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/* Providers */
import { Providers } from "@/components/providers/Provider";
import { EditorUIProvider } from '@/contexts/EditorUIContext';
import { OverlayProvider } from "@/contexts/OverlayContext";

import Navbar from "@/components/Navbar";

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
          <EditorUIProvider>
            <OverlayProvider>    
              <Navbar />
              <main className="flex-grow">
                {children}
              </main>
            </OverlayProvider>
          </EditorUIProvider>
        </Providers>
      </body>      
    </html>
   
  );
}