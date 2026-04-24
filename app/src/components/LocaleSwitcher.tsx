'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTransition } from 'react';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === 'ja' ? 'en' : 'ja';
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="px-3 py-1.5 text-sm font-mono bg-white/10 hover:bg-white/20 rounded transition"
      aria-label="Switch language"
    >
      {locale === 'ja' ? 'EN' : 'JA'}
    </button>
  );
}
