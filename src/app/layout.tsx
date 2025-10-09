import { AuthProvider } from '@/context/AuthContext';
import { AppCacheProvider } from '@/components/AppCacheProvider';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PromptForge",
  description: "Craft, Test, and Perfect Your AI Prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      {/* The body tag has no layout classes to prevent conflicts */}
      <body className={`${inter.className} bg-gray-900 text-gray-100`}>
        <AuthProvider>
          <Toaster position="bottom-center" />
          <AppCacheProvider>{children}</AppCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}