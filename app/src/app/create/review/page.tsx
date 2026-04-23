'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { usePreMintStore } from '@/stores/preMint';
import { useAuthStore } from '@/stores/auth';
import { mintCapsule } from '@/lib/sui/mint';
import { NETWORK } from '@/lib/sui/client';
import { cn } from '@/lib/utils';

// ── 定数 ──────────────────────────────────────────────────────────────────

const HOLD_MS = 2000;
const TICK_MS = 16;
const SVG_RADIUS = 52;
const SVG_CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS;

const FAUCET_URL =
  NETWORK === 'testnet'
    ? 'https://faucet.testnet.sui.io/'
    : 'https://faucet.devnet.sui.io/';

// ── サブコンポーネント ──────────────────────────────────────────────────────

function GlassCapsule({ src }: { src: string }) {
  return (
    <div className="animate-float relative mx-auto" style={{ width: 188, height: 268 }}>
      {/* 外側グロー */}
      <div
        className="absolute -inset-3 rounded-[120px] blur-2xl opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, oklch(0.72 0.22 295) 0%, transparent 70%)',
        }}
      />
      {/* カプセル本体 */}
      <div className="relative h-full w-full overflow-hidden rounded-[120px] border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* 写真 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="capsule photo" className="h-full w-full object-cover" />

        {/* ガラス上部ハイライト */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/28 via-white/5 to-transparent" />

        {/* 上部リムライン */}
        <div className="absolute top-8 left-10 right-10 h-px rounded-full bg-white/35" />

        {/* 下部ビネット */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* 内側ガラスリフレクション */}
        <div
          className="absolute left-3 top-8 w-5 rounded-full"
          style={{
            height: '45%',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
            filter: 'blur(4px)',
          }}
        />
      </div>
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
    </span>
  );
}

// ── Long-press ring button ─────────────────────────────────────────────────

function HoldToMintButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled: boolean;
}) {
  const [progress, setProgress] = useState(0); // 0..1
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);

  const cancelPress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startRef.current = null;
    setProgress(0);
  }, []);

  const startPress = useCallback(() => {
    if (disabled || confirmedRef.current || intervalRef.current) return;
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startRef.current ?? Date.now());
      const p = Math.min(elapsed / HOLD_MS, 1);
      setProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        confirmedRef.current = true;
        onConfirm();
      }
    }, TICK_MS);
  }, [disabled, onConfirm]);

  useEffect(() => () => cancelPress(), [cancelPress]);

  const dashOffset = SVG_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative cursor-pointer select-none"
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        style={{ touchAction: 'none' }}
      >
        {/* SVG progress ring */}
        <svg
          width="128"
          height="128"
          viewBox="0 0 120 120"
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden
        >
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={SVG_RADIUS}
            fill="none"
            strokeWidth="3"
            className="stroke-border"
          />
          {/* Fill */}
          <circle
            cx="60"
            cy="60"
            r={SVG_RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={SVG_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-primary"
            style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear` }}
          />
        </svg>

        {/* Inner button */}
        <div
          className={cn(
            'relative flex h-32 w-32 flex-col items-center justify-center rounded-full border transition-colors',
            disabled
              ? 'border-border bg-muted text-muted-foreground'
              : progress > 0
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:border-primary/40',
          )}
        >
          <span className="text-xs font-semibold leading-tight text-center">
            {progress > 0 ? (
              <>
                封印中
                <br />
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(progress * 100)}%
                </span>
              </>
            ) : (
              <>
                押し続けて
                <br />
                ミント
              </>
            )}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {disabled ? 'ログインが必要です' : '2 秒間長押しで確定'}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const store = usePreMintStore();
  const { session } = useAuthStore();

  const {
    photoBlobId,
    photoPreviewUrl,
    step1,
    step2,
    step3,
    eventName,
    fighterTag,
    reset,
  } = store;

  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);

  // ── ガード ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!photoBlobId) router.replace('/create/photo');
    else if (!step1.category || !step1.freeText.trim()) router.replace('/create/step1');
    else if (!step2.polarity || !step2.subcategory || !step2.connection.trim())
      router.replace('/create/step2');
    else if (!step3.memo.trim()) router.replace('/create/step3');
  }, [
    photoBlobId,
    step1.category,
    step1.freeText,
    step2.polarity,
    step2.subcategory,
    step2.connection,
    step3.memo,
    router,
  ]);

  if (
    !photoBlobId ||
    !step1.category ||
    !step2.polarity ||
    !step2.subcategory ||
    !step3.memo.trim()
  )
    return null;

  // ── ミント処理 ──────────────────────────────────────────────────────────

  const handleMint = async () => {
    if (!session) {
      toast.error('ログインが必要です', { description: '/login から Google でログインしてください' });
      return;
    }
    setMinting(true);
    setMintError(null);
    try {
      const objectId = await mintCapsule(
        { photoBlobId, step1, step2, step3, eventName, fighterTag },
        session,
      );
      reset();
      router.push(`/capsule/${objectId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setMintError(msg);
      toast.error('ミントに失敗しました', { description: msg });
    } finally {
      setMinting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 pb-10">
      {/* 戻る */}
      <button
        onClick={() => router.push('/create/step3')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        戻る
      </button>

      {/* ── ガラスカプセル アニメーション ── */}
      {photoPreviewUrl && (
        <div className="flex flex-col items-center gap-6 py-4">
          <GlassCapsule src={photoPreviewUrl} />
          <div className="text-center">
            <p className="text-lg font-bold">カプセルを確認</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              内容を確認してからミントしてください
            </p>
          </div>
        </div>
      )}

      {/* ── サマリカード ── */}
      <div className="space-y-6 rounded-2xl border border-border bg-card/50 px-5 py-6">
        {/* Meta */}
        <div className="flex flex-wrap gap-2">
          {eventName && (
            <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-secondary-foreground">
              {eventName}
            </span>
          )}
          {fighterTag && (
            <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-semibold text-primary">
              #{fighterTag}
            </span>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Step 1 */}
        <SummarySection title="Step 1 — 瞬間">
          <div className="flex flex-wrap gap-1.5">
            <Chip label={step1.category} />
            {step1.items.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
          {step1.freeText && (
            <p className="text-sm leading-relaxed text-foreground/80">
              "{step1.freeText}"
            </p>
          )}
        </SummarySection>

        <div className="h-px bg-border" />

        {/* Step 2 */}
        <SummarySection title="Step 2 — 感情">
          <div className="flex flex-wrap gap-1.5">
            <Chip label={step2.polarity} />
            <Chip label={step2.subcategory} />
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            "{step2.connection}"
          </p>
        </SummarySection>

        <div className="h-px bg-border" />

        {/* Step 3 */}
        <SummarySection title="Step 3 — メモ">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {step3.memo}
          </p>
        </SummarySection>
      </div>

      {/* ── 警告文 ── */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive/70" />
          <blockquote className="space-y-2 text-sm leading-relaxed text-foreground/80">
            <p>
              このカプセルには、あなたの言葉が封じられます。
            </p>
            <p>
              ミントすると Step 1–3 の中身は永久に不変になります。
            </p>
            <p>
              これが「この試合に対する、この瞬間のあなたの本音」として
              歴史に刻まれます。
            </p>
            <p className="font-semibold text-foreground">
              他人の感想を見る前に、確定させましょう。
            </p>
          </blockquote>
        </div>
      </div>

      {/* ── ガス代表示 ── */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary text-[11px]">
          Sponsored
        </span>
        <span>ガス代は運営負担です。SUI は不要。</span>
      </div>

      {/* ── ミントボタン ── */}
      {minting ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="size-12 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">ブロックチェーンに刻んでいます…</p>
        </div>
      ) : (
        <HoldToMintButton onConfirm={handleMint} disabled={!session} />
      )}

      {/* ── エラー + 再試行 ── */}
      {mintError && !minting && (
        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4">
          <p className="text-sm text-destructive">{mintError}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMint}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              再試行
            </button>
            {mintError.toLowerCase().includes('gas') ||
            mintError.toLowerCase().includes('balance') ||
            mintError.toLowerCase().includes('sui') ? (
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              >
                テストネット Faucet で SUI を取得 →
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
