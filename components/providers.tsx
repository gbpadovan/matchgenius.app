'use client';

import { ThemeProvider } from '@/components/theme-provider';

// This file is kept for backward compatibility
// The actual providers are now in components/providers/index.tsx
export function Providers({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
} 