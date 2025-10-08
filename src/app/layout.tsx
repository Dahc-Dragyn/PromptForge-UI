import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import Script from "next/script"; // 1. Import the Next.js Script component

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
        {/* 2. Add the Google Identity Services client script */}
        {/* This loads the library needed to render the Google Sign-In button */}
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <Toaster position="bottom-center" />
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}