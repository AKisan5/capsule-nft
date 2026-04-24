'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { usePreMintStore } from '@/stores/preMint';
import { CATEGORY_KEYS, CATEGORY_SUBCATEGORY_KEYS, type CategoryKey } from '@/lib/constants/categories';
import { cn } from '@/lib/utils';

export default function Step1Page() {
  const t = useTranslations('create.step1');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { photoBlobId, step1, setStep1 } = usePreMintStore();

  useEffect(() => {
    if (!photoBlobId) router.replace('/create/photo');
  }, [photoBlobId, router]);

  if (!photoBlobId) return null;

  const selectedSubcategoryKeys =
    step1.category ? (CATEGORY_SUBCATEGORY_KEYS[step1.category as CategoryKey] ?? []) : [];

  const handleCategoryChange = (value: string) => {
    setStep1({ category: value, items: [] });
  };

  const toggleItem = (sub: string) => {
    const next = step1.items.includes(sub)
      ? step1.items.filter((i) => i !== sub)
      : [...step1.items, sub];
    setStep1({ items: next });
  };

  const canProceed = !!step1.freeText.trim();

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/create/photo')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {tCommon('back')}
      </button>

      <div>
        <h1 className="text-xl font-bold leading-snug whitespace-pre-line">
          {t('title')}
        </h1>
      </div>

      {/* Category */}
      <RadioGroup
        value={step1.category}
        onValueChange={handleCategoryChange}
        className="gap-2"
      >
        {CATEGORY_KEYS.map((catKey) => {
          const active = step1.category === catKey;
          return (
            <label
              key={catKey}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all select-none',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-card/80',
              )}
            >
              <RadioGroupItem value={catKey} />
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  active ? 'text-primary' : 'text-foreground',
                )}
              >
                {t(`categories.${catKey}` as Parameters<typeof t>[0])}
              </span>
            </label>
          );
        })}
      </RadioGroup>

      {/* Subcategory */}
      {selectedSubcategoryKeys.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('subcategoryLabel')}
          </p>
          <div className="space-y-1.5">
            {selectedSubcategoryKeys.map((subKey) => {
              const checked = step1.items.includes(subKey);
              return (
                <label
                  key={subKey}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all select-none',
                    checked
                      ? 'border-primary/60 bg-primary/8'
                      : 'border-border bg-card hover:border-primary/30',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleItem(subKey)}
                  />
                  <span className="text-sm">
                    {t(`subcategories.${subKey}` as Parameters<typeof t>[0])}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Free text */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {t('freeTextLabel')}{' '}
          <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder={t('freeTextPlaceholder')}
          rows={4}
          value={step1.freeText}
          onChange={(e) => setStep1({ freeText: e.target.value })}
          className="resize-none text-sm"
        />
        {!canProceed && step1.freeText !== '' && (
          <p className="text-xs text-muted-foreground">{t('blankWarning')}</p>
        )}
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!canProceed}
        onClick={() => router.push('/create/step2')}
      >
        {t('nextButton')}
      </Button>
    </div>
  );
}
