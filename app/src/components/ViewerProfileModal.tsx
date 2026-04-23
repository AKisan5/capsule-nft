'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { ViewerProfile, FiveLevel } from '@/lib/seal/profile';

// ── 5-level scale option ───────────────────────────────────────────────────────

interface LevelOption {
  value: FiveLevel;
  label: string;
  desc: string;
}

const FIGHTER_KNOWLEDGE_OPTIONS: LevelOption[] = [
  { value: '1', label: '全く知らない',     desc: '今日初めて名前を聞いた' },
  { value: '2', label: '名前は知っている', desc: 'どんな選手かは知らない' },
  { value: '3', label: '試合を見たことある',desc: '何度か見たことがある' },
  { value: '4', label: 'よく追いかけている',desc: '最近の試合はだいたい把握' },
  { value: '5', label: '熟知している',     desc: '戦績・スタイルまで詳しい' },
];

const FIGHTER_IMPRESSION_OPTIONS: LevelOption[] = [
  { value: '1', label: '無関心',          desc: '特に関心はない' },
  { value: '2', label: '少し気になる',    desc: 'もう少し知りたい' },
  { value: '3', label: '興味がある',      desc: '今後も注目したい' },
  { value: '4', label: '応援している',    desc: '試合結果が気になる' },
  { value: '5', label: '大ファン',        desc: '追いかけ続けている' },
];

const MMA_KNOWLEDGE_OPTIONS: LevelOption[] = [
  { value: '1', label: '初めて見た',      desc: '格闘技はほぼ知らない' },
  { value: '2', label: '少し知っている',  desc: 'たまに見ることがある' },
  { value: '3', label: 'よく観る',        desc: '試合はよくチェックしている' },
  { value: '4', label: '詳しい',          desc: 'ルールや選手をよく知っている' },
  { value: '5', label: 'マニア',          desc: '技術・歴史まで追いかけている' },
];

// ── Radio card group ───────────────────────────────────────────────────────────

function ScaleGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: FiveLevel;
  onChange: (v: FiveLevel) => void;
  options: LevelOption[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as FiveLevel)}
        className="gap-2"
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition-all select-none',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <RadioGroupItem value={opt.value} />
              <div className="flex items-baseline gap-2">
                <p
                  className={cn(
                    'text-sm font-medium',
                    active ? 'text-primary' : '',
                  )}
                >
                  {opt.value}. {opt.label}
                </p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

interface ViewerProfileModalProps {
  open: boolean;
  fighterTag: string;
  onSubmit: (profile: ViewerProfile) => void;
}

export function ViewerProfileModal({
  open,
  fighterTag,
  onSubmit,
}: ViewerProfileModalProps) {
  const [fighterKnowledge, setFighterKnowledge] = useState<FiveLevel>('2');
  const [fighterImpression, setFighterImpression] = useState<FiveLevel>('3');
  const [mmaKnowledge, setMmaKnowledge] = useState<FiveLevel>('2');
  const [selfIntro, setSelfIntro] = useState('');

  const handleSubmit = () => {
    onSubmit({
      fighterKnowledge,
      fighterImpression,
      mmaKnowledge,
      selfIntro: selfIntro.trim() || undefined,
    });
  };

  const fighter = fighterTag || 'このファイター';

  return (
    <Dialog open={open} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base">カプセルを開く前に</DialogTitle>
          <DialogDescription>
            あなたのことを教えてください。
            <br />
            あなたの目線に合わせてこの瞬間を翻訳します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <ScaleGroup
            label={`Q1. ${fighter}についての知識量`}
            value={fighterKnowledge}
            onChange={setFighterKnowledge}
            options={FIGHTER_KNOWLEDGE_OPTIONS}
          />

          <ScaleGroup
            label={`Q2. ${fighter}への印象`}
            value={fighterImpression}
            onChange={setFighterImpression}
            options={FIGHTER_IMPRESSION_OPTIONS}
          />

          <ScaleGroup
            label="Q3. ONE Championship / MMA 全般の知識"
            value={mmaKnowledge}
            onChange={setMmaKnowledge}
            options={MMA_KNOWLEDGE_OPTIONS}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Q4. 一言自己紹介{' '}
              <span className="font-normal text-muted-foreground">(任意)</span>
            </p>
            <Textarea
              placeholder={`例: タイ在住、ムエタイ経験あり。${fighter}の試合を追いかけています。`}
              rows={2}
              value={selfIntro}
              onChange={(e) => setSelfIntro(e.target.value)}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <div className="-mx-4 -mb-4 border-t bg-muted/50 px-4 py-4">
          <Button className="w-full" onClick={handleSubmit}>
            カプセルを開ける
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
