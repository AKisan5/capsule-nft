'use client';

import { useTranslations } from 'next-intl';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const t = useTranslations('login');
  const account = useCurrentAccount();
  const router = useRouter();

  useEffect(() => {
    if (account) router.push('/my');
  }, [account, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-950 to-indigo-950">
      <div className="w-full max-w-md p-8 space-y-6 text-center">
        <h1 className="text-4xl font-bold text-white">{t('title')}</h1>
        <p className="text-white/70">{t('tagline')}</p>
        <div className="pt-4 flex justify-center">
          <ConnectButton connectText={t('connectButton')} />
        </div>
        <p className="text-xs text-white/40">{t('supportedWallets')}</p>
      </div>
    </main>
  );
}
