'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePreMintStore } from '@/stores/preMint';

// ── IndexedDB autosave ────────────────────────────────────────────────────

const DRAFT_DB = 'capsule_draft';
const DRAFT_STORE = 'step3';

interface DraftPayload {
  memo: string;
  eventName: string;
  fighterTag: string;
  savedAt: number;
}

function openDraftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRAFT_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DRAFT_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDraft(payload: DraftPayload): Promise<void> {
  const db = await openDraftDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite');
    tx.objectStore(DRAFT_STORE).put(payload, 'current');
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function loadDraft(): Promise<DraftPayload | null> {
  const db = await openDraftDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(DRAFT_STORE, 'readonly');
    const req = tx.objectStore(DRAFT_STORE).get('current');
    req.onsuccess = () => res((req.result as DraftPayload) ?? null);
    req.onerror = () => rej(req.error);
  });
}

// ── サマリカード ───────────────────────────────────────────────────────────

function Chip({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={
        muted
          ? 'rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground'
          : 'rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary'
      }
    >
      {label}
    </span>
  );
}

function CollapsibleSummary() {
  const { step1, step2 } = usePreMintStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Chip label={step1.category} />
          <Chip label={step2.polarity} />
          <Chip label={step2.subcategory} />
        </div>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4">
          {/* Step 1 */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step 1 — 瞬間
            </p>
            {step1.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {step1.items.map((item) => (
                  <Chip key={item} label={item} muted />
                ))}
              </div>
            )}
            {step1.freeText && (
              <p className="text-sm text-foreground/80 leading-relaxed">
                "{step1.freeText}"
              </p>
            )}
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step 2 — 感情
            </p>
            {step2.connection && (
              <p className="text-sm text-foreground/80 leading-relaxed">
                "{step2.connection}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const CHAR_MIN = 10;

export default function Step3Page() {
  const router = useRouter();
  const {
    photoBlobId,
    step1,
    step2,
    step3,
    eventName,
    fighterTag,
    setStep3,
    setEventName,
    setFighterTag,
  } = usePreMintStore();

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── ガード ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!photoBlobId) {
      router.replace('/create/photo');
    } else if (!step1.category || !step1.freeText.trim()) {
      router.replace('/create/step1');
    } else if (
      !step2.polarity ||
      !step2.subcategory ||
      !step2.connection.trim()
    ) {
      router.replace('/create/step2');
    }
  }, [
    photoBlobId,
    step1.category,
    step1.freeText,
    step2.polarity,
    step2.subcategory,
    step2.connection,
    router,
  ]);

  // ── IDB 復元 (初回マウント) ───────────────────────────────────────────────

  useEffect(() => {
    if (step3.memo) return; // すでに入力済みなら復元しない
    loadDraft()
      .then((draft) => {
        if (!draft) return;
        if (draft.memo) setStep3({ memo: draft.memo });
        if (draft.eventName && !eventName) setEventName(draft.eventName);
        if (draft.fighterTag && !fighterTag) setFighterTag(draft.fighterTag);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── アンマウント時タイマークリア ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  if (
    !photoBlobId ||
    !step1.category ||
    !step2.polarity ||
    !step2.subcategory
  )
    return null;

  // ── アイドル 10 秒でオートセーブ ─────────────────────────────────────────

  const scheduleAutosave = (memo: string) => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      saveDraft({
        memo,
        eventName,
        fighterTag,
        savedAt: Date.now(),
      }).catch(() => {});
    }, 10_000);
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setStep3({ memo: value });
    scheduleAutosave(value);
  };

  const charCount = step3.memo.trim().length;
  const canProceed = charCount >= CHAR_MIN;

  return (
    <div className="space-y-10">
      {/* 戻る */}
      <button
        onClick={() => router.push('/create/step2')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        戻る
      </button>

      {/* Step 1-2 サマリ (collapsible) */}
      <CollapsibleSummary />

      {/* メッセージ */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold leading-snug tracking-tight">
          これを、あなたの言葉で
          <br />
          メモにしてください。
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          書き方は自由。「やばい」のまま書いてもいい。
          <br />
          大事なのは、最後まで書き終えること。
        </p>
      </div>

      {/* 大会・ファイター入力 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            どの大会?
          </label>
          <Input
            placeholder="ONE Fight Night 25"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            誰の?
          </label>
          <Input
            placeholder="武尊, Stamp…"
            value={fighterTag}
            onChange={(e) => setFighterTag(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* メモ textarea */}
      <div className="space-y-2">
        <Textarea
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          placeholder={`例: あの瞬間、鳥肌が立った。まだ整理できないけど、あの右ストレートを見た瞬間に何かが変わった気がした。言葉にするのは難しいけれど、これだけは言える——`}
          rows={12}
          value={step3.memo}
          onChange={handleMemoChange}
          className="resize-none text-sm leading-relaxed"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {charCount < CHAR_MIN ? (
              <span className="text-muted-foreground">
                あと{' '}
                <span className="font-semibold text-foreground">
                  {CHAR_MIN - charCount}
                </span>{' '}
                文字
              </span>
            ) : (
              <span className="text-primary font-medium">✓ 書き終えられます</span>
            )}
          </span>
          <span>{charCount} 文字</span>
        </div>
      </div>

      {/* ボタン */}
      <Button
        className="w-full"
        size="lg"
        disabled={!canProceed}
        onClick={() => {
          // 即時セーブしてから遷移
          if (idleTimer.current) clearTimeout(idleTimer.current);
          saveDraft({
            memo: step3.memo,
            eventName,
            fighterTag,
            savedAt: Date.now(),
          }).catch(() => {});
          router.push('/create/review');
        }}
      >
        書き終えた
      </Button>
    </div>
  );
}
