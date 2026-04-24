import type { ReactNode } from 'react';

// Minimal root layout — <html> and <body> are provided by [locale]/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
