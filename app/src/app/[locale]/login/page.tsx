'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const account = useCurrentAccount();
  const router = useRouter();

  useEffect(() => {
    if (account) router.push('/my');
  }, [account, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-950 to-indigo-950">
      <div className="w-full max-w-md p-8 space-y-6 text-center">
        <h1 className="text-4xl font-bold text-white">Capsule</h1>
        <p className="text-white/70">あなたの感動を、永久に。</p>
        <div className="pt-4 flex justify-center">
          <ConnectButton connectText="ウォレットで接続する" />
        </div>
        <p className="text-xs text-white/40">対応: Sui Wallet / Suiet / Slush / Ethos</p>
      </div>
    </main>
  );
}
