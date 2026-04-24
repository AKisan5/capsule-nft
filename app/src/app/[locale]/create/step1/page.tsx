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
import { CATEGORIES, getCategoryByValue } from '@/lib/constants/categories';
import { cn } from '@/lib/utils';

// Map on-chain Japanese values → translation keys (values must stay Japanese for on-chain compat)
const CATEGORY_KEY: Record<string, string> = {
  '入場・セレモニー': 'entrance',
  '試合の展開':       'fight',
  '結末':             'ending',
  '試合後':           'afterFight',
  '違和感・モヤモヤ': 'uneasy',
};

const SUBCATEGORY_KEY: Record<string, string> = {
  '入場曲':             'entranceMusic',
  '表情・佇まい':       'entranceFace',
  '衣装':               'costume',
  'コーナーやりとり':   'cornerTalk',
  'フェイスオフ':       'faceOff',
  'ラウンド戦略の変化': 'strategyShift',
  '決定的な技':         'decisiveMove',
  '耐えた瞬間':         'endurance',
  'セコンドの声かけ':   'secondVoice',
  '観客との相互作用':   'crowdInteraction',
  '勝敗の決まり方':     'outcome',
  '勝利/敗北の受け止め':'reaction',
  '相手選手との握手':   'handshake',
  '判定への反応':       'decision',
  'インタビュー':       'interview',
  '家族・セコンドとの抱擁': 'embrace',
  '敗者の振る舞い':     'loserGrace',
  '感情の爆発':         'emotionBurst',
  '納得いかなかった判定': 'unsatisfied',
  '期待と違った展開':   'unexpected',
  '理解できなかった演出': 'unclear',
  'まだ言葉にできない': 'indescribable',
};

export default function Step1Page() {
  const t = useTranslations('create.step1');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { photoBlobId, step1, setStep1 } = usePreMintStore();

  useEffect(() => {
    if (!photoBlobId) router.replace('/create/photo');
  }, [photoBlobId, router]);

  if (!photoBlobId) return null;

  const selectedCategory = getCategoryByValue(step1.category);

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

      {/* ── カテゴリ選択 ── */}
      <RadioGroup
        value={step1.category}
        onValueChange={handleCategoryChange}
        className="gap-2"
      >
        {CATEGORIES.map((cat) => {
          const active = step1.category === cat.value;
          const labelKey = CATEGORY_KEY[cat.value];
          return (
            <label
              key={cat.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all select-none',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-card/80',
              )}
            >
              <RadioGroupItem value={cat.value} />
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  active ? 'text-primary' : 'text-foreground',
                )}
              >
                {labelKey ? t(`categories.${labelKey}`) : cat.label}
              </span>
            </label>
          );
        })}
      </RadioGroup>

      {/* ── サブカテゴリ (動的) ── */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('subcategoryLabel')}
          </p>
          <div className="space-y-1.5">
            {selectedCategory.subcategories.map((sub) => {
              const checked = step1.items.includes(sub);
              const subKey = SUBCATEGORY_KEY[sub];
              return (
                <label
                  key={sub}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all select-none',
                    checked
                      ? 'border-primary/60 bg-primary/8'
                      : 'border-border bg-card hover:border-primary/30',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleItem(sub)}
                  />
                  <span className="text-sm">
                    {subKey ? t(`subcategories.${subKey}`) : sub}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 自由記述 ── */}
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
