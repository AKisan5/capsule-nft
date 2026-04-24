import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import '@mysten/dapp-kit/dist/index.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Capsule — ONE Championship Moment Vault',
  description:
    'ONE Championship 観戦で心が震えた一瞬を、写真と自分の言葉でカプセルに封じ、Sui オンチェーンに永久保存する DApp。',
  openGraph: {
    title: 'Capsule',
    description: 'Mint your ONE Championship moment on Sui.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a12',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`dark h-full ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full antialiased">
        {/* 紫 → 藍グラデーションオーバーレイ (固定・非インタラクティブ) */}
        <div
          aria-hidden="true"
          className="capsule-gradient pointer-events-none fixed inset-0 -z-10"
        />

        <Providers>{children}</Providers>

        {/* Toast 通知 (Walrus アップロード成否など) */}
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: 'bg-card border border-border text-foreground',
              description: 'text-muted-foreground',
            },
          }}
        />
      </body>
    </html>
  );
}
