// src/app/prompts/layout.tsx
import type { Metadata } from 'next';

// This is the metadata you originally had on the 'all' page.
// By putting it here, it applies to all pages *inside* the /prompts folder.
export const metadata: Metadata = {
  robots: {
      index: false, // Prevents /prompts/* pages from being indexed
      follow: false, // Prevents crawlers from following links on these pages
  },
};

/**
 * This is the required layout component.
 * It doesn't need any extra HTML. It just passes its children 
 * (e.g., your 'all' page) through, and they will
 * automatically be wrapped by the RootLayout (app/layout.tsx).
 */
export default function PromptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}