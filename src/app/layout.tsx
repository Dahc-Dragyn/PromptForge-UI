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

// --- START OF REQUIRED OPEN GRAPH METADATA FIX ---
export const metadata: Metadata = {
  title: 'PromptForge',
  description: 'Craft, Test, and Perfect Your AI Prompts',
  openGraph: {
    title: 'PromptForge: The AI Prompt Workbench',
    description: 'Build, test, save, and optimize the perfect prompts for ChatGPT and Gemini.',
    url: 'https://promptforge.aiyoda.app/',
    type: 'website',
    images: [
      {
        // Absolute URL to the 1200x630 image hosted in GCS
        url: 'https://storage.googleapis.com/chads/1200%20x%20630.png', 
        width: 1200,
        height: 630,
        alt: 'PromptForge: The AI Prompt Workbench',
      },
    ],
  },
};
// --- END OF REQUIRED OPEN GRAPH METADATA FIX ---

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
        - 'h-screen' makes the body fill the viewport height.
        - 'flex flex-col' creates a vertical layout for the Navbar and main content.
      */}
      <body className={`${inter.className} h-screen flex flex-col bg-gray-900`}>
        {/* FIX: Using react-hot-toast's Toaster, as it was originally */}
        <Toaster position="top-center" />
        <AuthProvider>
          <AppCacheProvider>
            <Navbar />
            {/* Main Content Area:
              - 'flex-1' allows this area to grow and fill the remaining vertical space.
              - 'overflow-y-auto' ensures that only this main content area will scroll if its content is too long.
            */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </AppCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}