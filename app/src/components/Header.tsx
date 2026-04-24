'use client';

import { useTranslations } from 'next-intl';
import { ConnectButton } from '@mysten/dapp-kit';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

export function Header() {
  const t = useTranslations('header');

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight hover:text-primary transition-colors"
        >
          Capsule
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <ConnectButton connectText={t('connect')} />
        </div>
      </div>
    </header>
  );
}
