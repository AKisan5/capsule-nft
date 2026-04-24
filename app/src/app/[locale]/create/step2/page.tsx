'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { usePreMintStore } from '@/stores/preMint';
import { type CategoryKey } from '@/lib/constants/categories';
import { cn } from '@/lib/utils';

const POLARITY_KEYS = ['positive', 'negative'] as const;
type PolarityKey = typeof POLARITY_KEYS[number];

const SUBCATEGORY_KEYS_MAP: Record<PolarityKey, readonly string[]> = {
  positive: ['empathy', 'surprise'],
  negative: ['unpleasant', 'boring'],
};

// ── Step1 summary ──────────────────────────────────────────────────────────

function Step1Summary({
  category,
  items,
  freeText,
}: {
  category: string;
  items: string[];
  freeText: string;
}) {
  const t = useTranslations('create.step2');
  const tStep1 = useTranslations('create.step1');
  return (
    <div className="rounded-2xl border border-border bg-muted/40 px-5 py-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t('step1Summary')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {category && (
          <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-semibold text-primary">
            {tStep1(`categories.${category}` as Parameters<typeof tStep1>[0])}
          </span>
        )}
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {tStep1(`subcategories.${item}` as Parameters<typeof tStep1>[0])}
          </span>
        ))}
      </div>
      {freeText && (
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
          &ldquo;{freeText}&rdquo;
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Step2Page() {
  const t = useTranslations('create.step2');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { photoBlobId, step1, step2, setStep2 } = usePreMintStore();

  useEffect(() => {
    if (!photoBlobId) router.replace('/create/photo');
    else if (!step1.category || !step1.freeText.trim()) router.replace('/create/step1');
  }, [photoBlobId, step1.category, step1.freeText, router]);

  if (!photoBlobId || !step1.category) return null;

  const subcategoryValues =
    (step2.polarity as PolarityKey) in SUBCATEGORY_KEYS_MAP
      ? SUBCATEGORY_KEYS_MAP[step2.polarity as PolarityKey]
      : [];

  const subcategoryGroup =
    step2.polarity === 'positive' ? 'subcategoryPositive' : 'subcategoryNegative';

  const prompt =
    step2.subcategory && step2.polarity
      ? t(`${subcategoryGroup}.${step2.subcategory}.prompt` as Parameters<typeof t>[0])
      : '';

  const canProceed =
    !!step2.polarity && !!step2.subcategory && !!step2.connection.trim();

  const handlePolarityChange = (val: string) => {
    setStep2({ polarity: val, subcategory: '', connection: '' });
  };

  const handleSubcategoryChange = (val: string) => {
    setStep2({ subcategory: val, connection: '' });
  };

  return (
    <div className="space-y-10">
      <button
        onClick={() => router.push('/create/step1')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {tCommon('back')}
      </button>

      <Step1Summary
        category={step1.category}
        items={step1.items}
        freeText={step1.freeText}
      />

      {/* Polarity */}
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold leading-snug">{t('polarityTitle')}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t('polarityHint')}</p>
        </div>

        <RadioGroup
          value={step2.polarity}
          onValueChange={handlePolarityChange}
          className="grid grid-cols-2 gap-3"
        >
          {POLARITY_KEYS.map((polKey) => {
            const active = step2.polarity === polKey;
            return (
              <label
                key={polKey}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-all select-none',
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-card/80',
                )}
              >
                <RadioGroupItem value={polKey} />
                <span
                  className={cn(
                    'text-base font-semibold transition-colors',
                    active ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {t(`polarity.${polKey}` as Parameters<typeof t>[0])}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Subcategory */}
      {step2.polarity && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold leading-snug">{t('subcategoryTitle')}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{t('subcategoryHint')}</p>
          </div>

          <RadioGroup
            value={step2.subcategory}
            onValueChange={handleSubcategoryChange}
            className="gap-3"
          >
            {subcategoryValues.map((subKey) => {
              const selected = step2.subcategory === subKey;
              const labelKey = `${subcategoryGroup}.${subKey}.label` as Parameters<typeof t>[0];
              const descKey  = `${subcategoryGroup}.${subKey}.description` as Parameters<typeof t>[0];
              return (
                <label
                  key={subKey}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-5 py-4 transition-all select-none',
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-card/80',
                  )}
                >
                  <RadioGroupItem value={subKey} className="mt-0.5 shrink-0" />
                  <div>
                    <p
                      className={cn(
                        'text-sm font-semibold transition-colors',
                        selected ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {t(labelKey)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t(descKey)}</p>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>
      )}

      {/* Connection */}
      {step2.subcategory && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold leading-snug">{prompt}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="text-destructive">*</span> {tCommon('required')} —{' '}
              {t('connectionHint')}
            </p>
          </div>

          <Textarea
            placeholder={t('connectionPlaceholder')}
            rows={5}
            value={step2.connection}
            onChange={(e) => setStep2({ connection: e.target.value })}
            className="resize-none text-sm"
          />
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!canProceed}
        onClick={() => router.push('/create/step3')}
      >
        {t('nextButton')}
      </Button>
    </div>
  );
}
