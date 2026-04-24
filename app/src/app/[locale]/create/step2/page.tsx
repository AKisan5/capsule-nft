'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { usePreMintStore } from '@/stores/preMint';
import { cn } from '@/lib/utils';

// On-chain polarity values → translation keys
const POLARITY_KEY: Record<string, 'positive' | 'negative'> = {
  'ポジティブ': 'positive',
  'ネガティブ': 'negative',
};

// On-chain subcategory values → translation path segments
const SUBCATEGORY_KEY: Record<string, { group: 'subcategoryPositive' | 'subcategoryNegative'; key: 'empathy' | 'surprise' | 'unpleasant' | 'boring' }> = {
  '共感': { group: 'subcategoryPositive', key: 'empathy'    },
  '驚き': { group: 'subcategoryPositive', key: 'surprise'   },
  '不快': { group: 'subcategoryNegative', key: 'unpleasant' },
  '退屈': { group: 'subcategoryNegative', key: 'boring'     },
};

// On-chain values kept as-is; only display labels come from i18n
const POLARITY_VALUES = ['ポジティブ', 'ネガティブ'] as const;
const POSITIVE_SUB_VALUES = ['共感', '驚き'] as const;
const NEGATIVE_SUB_VALUES = ['不快', '退屈'] as const;

// ── サブコンポーネント ──────────────────────────────────────────────────────

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
  return (
    <div className="rounded-2xl border border-border bg-muted/40 px-5 py-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t('step1Summary')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-semibold text-primary">
          {category}
        </span>
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {item}
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
    step2.polarity === 'ポジティブ' ? POSITIVE_SUB_VALUES :
    step2.polarity === 'ネガティブ' ? NEGATIVE_SUB_VALUES :
    [];

  const promptKey = step2.subcategory ? SUBCATEGORY_KEY[step2.subcategory] : null;
  const prompt = promptKey
    ? t(`${promptKey.group}.${promptKey.key}.prompt` as Parameters<typeof t>[0])
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
      {/* 戻る */}
      <button
        onClick={() => router.push('/create/step1')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {tCommon('back')}
      </button>

      {/* Step 1 サマリ */}
      <Step1Summary
        category={step1.category}
        items={step1.items}
        freeText={step1.freeText}
      />

      {/* ── Polarity ── */}
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
          {POLARITY_VALUES.map((pol) => {
            const active = step2.polarity === pol;
            const key = POLARITY_KEY[pol];
            return (
              <label
                key={pol}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-all select-none',
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-card/80',
                )}
              >
                <RadioGroupItem value={pol} />
                <span
                  className={cn(
                    'text-base font-semibold transition-colors',
                    active ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {t(`polarity.${key}`)}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {/* ── Subcategory (動的) ── */}
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
            {subcategoryValues.map((val) => {
              const info = SUBCATEGORY_KEY[val];
              const selected = step2.subcategory === val;
              const labelKey = `${info.group}.${info.key}.label` as Parameters<typeof t>[0];
              const descKey  = `${info.group}.${info.key}.description` as Parameters<typeof t>[0];
              return (
                <label
                  key={val}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-5 py-4 transition-all select-none',
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-card/80',
                  )}
                >
                  <RadioGroupItem value={val} className="mt-0.5 shrink-0" />
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

      {/* ── Connection (動的) ── */}
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

      {/* ── Next ── */}
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
