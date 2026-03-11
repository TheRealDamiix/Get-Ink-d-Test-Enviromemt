import React from 'react';
import { Toaster } from '@/components/ui/toaster';

/**
 * RootLayout — Next.js App Router migration aid.
 *
 * This mirrors what `app/layout.tsx` will look like when migrating to Next.js.
 * Currently unused in Vite (App.tsx handles layout directly via BrowserRouter),
 * but the structure is ready for when we migrate.
 *
 * Usage in Next.js app/layout.tsx:
 *   export default function Layout({ children }: { children: React.ReactNode }) {
 *     return <RootLayout>{children}</RootLayout>;
 *   }
 */

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {children}
      <Toaster />
    </div>
  );
}
