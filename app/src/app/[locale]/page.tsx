import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Home() {
  const t = useTranslations('home');
  const tLogin = useTranslations('login');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{tLogin('title')}</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">{t('hero')}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/create/photo" className={cn(buttonVariants({ size: 'lg' }))}>
          {t('cta')}
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
          {t('login')}
        </Link>
      </div>
    </main>
  );
}
