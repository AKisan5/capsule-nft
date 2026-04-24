'use client';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const STEPS = [
  { path: '/create/photo', label: '写真' },
  { path: '/create/step1', label: '瞬間' },
  { path: '/create/step2', label: '感情' },
  { path: '/create/step3', label: 'メモ' },
  { path: '/create/review', label: '確認' },
];

export function StepProgress() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => s.path === pathname);

  return (
    <div className="flex items-center justify-center gap-0 px-4 py-3">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.path} className="flex items-center">
            {/* connector */}
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-6 transition-colors',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            {/* dot */}
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
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
