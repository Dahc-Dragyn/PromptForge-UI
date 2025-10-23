// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { AppCacheProvider } from '@/components/AppCacheProvider';
import { Toaster } from 'react-hot-toast'; // FIX: Reverted to react-hot-toast
import Script from 'next/script'; // Need this for GSI

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PromptForge',
  description: 'Craft, Test, and Perfect Your AI Prompts',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* CRITICAL: This GSI script is required for Google Auth to function */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
      </head>
      {/* Layout Fix: 
        - 'h-screen' ensures the app fills the viewport height.
        - 'flex flex-col' creates the vertical layout for Navbar + main content.
      */}
      <body className={`${inter.className} h-screen flex flex-col`}>
        {/* FIX: Using react-hot-toast's Toaster, as it was originally */}
        <Toaster position="top-center" />
        <AuthProvider>
          <AppCacheProvider>
            <Navbar />
            {/* Main Content Area:
              - 'flex-1' makes it fill all *remaining* vertical space.
              - 'overflow-y-auto' ensures ONLY this area scrolls, not the whole page.
              - 'p-6' adds padding. 'bg-gray-900' is the background color.
            */}
            <main className="flex-1 overflow-y-auto p-6 bg-gray-900">
              {children}
            </main>
          </AppCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}