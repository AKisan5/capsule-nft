'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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

type OptionGroupKey = 'fighterKnowledge' | 'fighterImpression' | 'mmaKnowledge';

// ── Radio card group ───────────────────────────────────────────────────────────

function ScaleGroup({
  label,
  value,
  onChange,
  optionGroup,
}: {
  label: string;
  value: FiveLevel;
  onChange: (v: FiveLevel) => void;
  optionGroup: OptionGroupKey;
}) {
  const t = useTranslations('capsule.profileModal');
  const levels: FiveLevel[] = ['1', '2', '3', '4', '5'];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as FiveLevel)}
        className="gap-2"
      >
        {levels.map((level) => {
          const active = value === level;
          return (
            <label
              key={level}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition-all select-none',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <RadioGroupItem value={level} />
              <div className="flex items-baseline gap-2">
                <p
                  className={cn(
                    'text-sm font-medium',
                    active ? 'text-primary' : '',
                  )}
                >
                  {level}. {t(`${optionGroup}.${level}.label` as Parameters<typeof t>[0])}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`${optionGroup}.${level}.desc` as Parameters<typeof t>[0])}
                </p>
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
  const t = useTranslations('capsule.profileModal');
  const tCommon = useTranslations('common');
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

  const fighter = fighterTag || 'this fighter';

  return (
    <Dialog open={open} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base">{t('title')}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <ScaleGroup
            label={t('q1', { fighter })}
            value={fighterKnowledge}
            onChange={setFighterKnowledge}
            optionGroup="fighterKnowledge"
          />

          <ScaleGroup
            label={t('q2', { fighter })}
            value={fighterImpression}
            onChange={setFighterImpression}
            optionGroup="fighterImpression"
          />

          <ScaleGroup
            label={t('q3')}
            value={mmaKnowledge}
            onChange={setMmaKnowledge}
            optionGroup="mmaKnowledge"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t('q4')}{' '}
              <span className="font-normal text-muted-foreground">
                ({tCommon('optional')})
              </span>
            </p>
            <Textarea
              placeholder={t('selfIntroPlaceholder', { fighter })}
              rows={2}
              value={selfIntro}
              onChange={(e) => setSelfIntro(e.target.value)}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <div className="-mx-4 -mb-4 border-t bg-muted/50 px-4 py-4">
          <Button className="w-full" onClick={handleSubmit}>
            {t('submitButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
