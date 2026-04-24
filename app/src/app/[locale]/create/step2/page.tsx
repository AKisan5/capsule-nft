'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { usePreMintStore } from '@/stores/preMint';
import { cn } from '@/lib/utils';

// ── 三宅香帆の原則に基づく 4 分類 ──────────────────────────────────────────

interface SubcategoryDef {
  value: string;
  label: string;
  description: string;
  prompt: string;
}

const POSITIVE_SUBS: SubcategoryDef[] = [
  {
    value: '共感',
    label: '共感',
    description: '自分の体験・好みと重なる',
    prompt: '自分のどんな体験・好みと共通する?',
  },
  {
    value: '驚き',
    label: '驚き',
    description: '予想外の展開・新しい発見がある',
    prompt: 'どこが新しいと感じた?',
  },
];

const NEGATIVE_SUBS: SubcategoryDef[] = [
  {
    value: '不快',
    label: '不快',
    description: '何かが引っかかる・嫌な感覚が残る',
    prompt: 'なぜそう感じた?',
  },
  {
    value: '退屈',
    label: '退屈',
    description: '物足りない・期待と違う手応えだった',
    prompt: 'なぜそう感じた?',
  },
];

function getSubcategories(polarity: string): SubcategoryDef[] {
  if (polarity === 'ポジティブ') return POSITIVE_SUBS;
  if (polarity === 'ネガティブ') return NEGATIVE_SUBS;
  return [];
}

function getPrompt(subcategory: string): string {
  return (
    [...POSITIVE_SUBS, ...NEGATIVE_SUBS].find((s) => s.value === subcategory)
      ?.prompt ?? ''
  );
}

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
  return (
    <div className="rounded-2xl border border-border bg-muted/40 px-5 py-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Step 1 の記録
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
          "{freeText}"
        </p>
      )}
    </div>
  );
}

function SubcategoryCard({
  sub,
  selected,
  onSelect,
}: {
  sub: SubcategoryDef;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border px-5 py-4 transition-all select-none',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/40 hover:bg-card/80',
      )}
    >
      <RadioGroupItem value={sub.value} className="mt-0.5 shrink-0" />
      <div>
        <p
          className={cn(
            'text-sm font-semibold transition-colors',
            selected ? 'text-primary' : 'text-foreground',
          )}
        >
          {sub.label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub.description}</p>
      </div>
    </label>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Step2Page() {
  const router = useRouter();
  const { photoBlobId, step1, step2, setStep2 } = usePreMintStore();

  useEffect(() => {
    if (!photoBlobId) router.replace('/create/photo');
    else if (!step1.category || !step1.freeText.trim()) router.replace('/create/step1');
  }, [photoBlobId, step1.category, step1.freeText, router]);

  if (!photoBlobId || !step1.category) return null;

  const subcategories = getSubcategories(step2.polarity);
  const prompt = getPrompt(step2.subcategory);
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
        戻る
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
          <h1 className="text-xl font-bold leading-snug">
            その感情の向きは?
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            プラスとマイナス、どちらに近かったですか
          </p>
        </div>

        <RadioGroup
          value={step2.polarity}
          onValueChange={handlePolarityChange}
          className="grid grid-cols-2 gap-3"
        >
          {(['ポジティブ', 'ネガティブ'] as const).map((pol) => {
            const active = step2.polarity === pol;
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
                  {pol === 'ポジティブ' ? '✦ ポジティブ' : '◆ ネガティブ'}
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
            <h2 className="text-lg font-bold leading-snug">
              その感情をもう少し詳しく
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              4 分類のうち、一番近いものを選んでください
            </p>
          </div>

          <RadioGroup
            value={step2.subcategory}
            onValueChange={handleSubcategoryChange}
            className="gap-3"
          >
            {subcategories.map((sub) => (
              <SubcategoryCard
                key={sub.value}
                sub={sub}
                selected={step2.subcategory === sub.value}
                onSelect={() => handleSubcategoryChange(sub.value)}
              />
            ))}
          </RadioGroup>
        </div>
      )}

      {/* ── Connection (動的) ── */}
      {step2.subcategory && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold leading-snug">{prompt}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="text-destructive">*</span> 必須 —
              この言葉が次のステップで書くメモの土台になります
            </p>
          </div>

          <Textarea
            placeholder="思いついたままの言葉で構いません。断片でも、箇条書きでも。"
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
        次へ — メモを書く
      </Button>
    </div>
  );
}
