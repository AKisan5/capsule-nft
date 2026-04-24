'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { usePreMintStore } from '@/stores/preMint';
import { CATEGORIES, getCategoryByValue } from '@/lib/constants/categories';
import { cn } from '@/lib/utils';

export default function Step1Page() {
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
        戻る
      </button>

      <div>
        <h1 className="text-xl font-bold leading-snug">
          この写真の、どの瞬間が
          <br />
          心を動かされた?
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
                {cat.label}
              </span>
            </label>
          );
        })}
      </RadioGroup>

      {/* ── サブカテゴリ (動的) ── */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            具体的にどの場面? (複数選択可)
          </p>
          <div className="space-y-1.5">
            {selectedCategory.subcategories.map((sub) => {
              const checked = step1.items.includes(sub);
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
                  <span className="text-sm">{sub}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 自由記述 ── */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          具体的に何が?{' '}
          <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="あのシーンのどこが、なぜ心に刺さったか — 自分の言葉で書いてください"
          rows={4}
          value={step1.freeText}
          onChange={(e) => setStep1({ freeText: e.target.value })}
          className="resize-none text-sm"
        />
        {!canProceed && step1.freeText !== '' && (
          <p className="text-xs text-muted-foreground">空白のみは入力とみなされません</p>
        )}
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!canProceed}
        onClick={() => router.push('/create/step2')}
      >
        次へ — 感情を記録
      </Button>
    </div>
  );
}
