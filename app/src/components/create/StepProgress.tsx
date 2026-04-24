'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const STEP_KEYS = [
  { path: '/create/photo',  key: 'photo'  },
  { path: '/create/step1',  key: 'step1'  },
  { path: '/create/step2',  key: 'step2'  },
  { path: '/create/step3',  key: 'step3'  },
  { path: '/create/review', key: 'review' },
] as const;

export function StepProgress() {
  const t = useTranslations('create.stepLabels');
  const pathname = usePathname();
  const currentIndex = STEP_KEYS.findIndex((s) => s.path === pathname);

  return (
    <div className="flex items-center justify-center gap-0 px-4 py-3">
      {STEP_KEYS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.path} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-6 transition-colors',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-all',
                  active
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/40'
                    : done
                      ? 'bg-primary/70 text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] transition-colors',
                  active
                    ? 'text-primary font-medium'
                    : done
                      ? 'text-primary/70'
                      : 'text-muted-foreground',
                )}
              >
                {t(step.key)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
