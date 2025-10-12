import { AuthProvider } from '@/context/AuthContext';
import { AppCacheProvider } from '@/components/AppCacheProvider';
import Navbar from '@/components/Navbar'; // Make sure the Navbar is imported
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
      <body className={`${inter.className} bg-gray-900 text-gray-100`}>
        <AuthProvider>
          <Toaster position="top-center" />
          <AppCacheProvider>
            {/* This div creates the full-screen flex container */}
            <div className="flex flex-col min-h-screen">
              <Navbar />
              {/* The <main> tag now grows to fill all available space */}
              <main className="flex-1 w-full">
                {children}
              </main>
            </div>
          </AppCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}