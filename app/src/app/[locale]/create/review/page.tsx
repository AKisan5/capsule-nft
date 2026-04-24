'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { usePreMintStore } from '@/stores/preMint';
import { mintDemo, buildMintTx, extractCapsuleObjectId } from '@/lib/sui/mint';
import { NETWORK, getSuiClient } from '@/lib/sui/client';
import { cn } from '@/lib/utils';

// ── IndexedDB draft clear ──────────────────────────────────────────────────────

async function clearStep3Draft(): Promise<void> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('capsule_draft', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('step3', 'readwrite');
      tx.objectStore('step3').delete('current');
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* ignore */ }
}

// ── 定数 ──────────────────────────────────────────────────────────────────────

const HOLD_MS = 2000;
const TICK_MS = 16;
const SVG_RADIUS = 52;
const SVG_CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS;

const FAUCET_URL =
  NETWORK === 'testnet'
    ? 'https://faucet.testnet.sui.io/'
    : 'https://faucet.devnet.sui.io/';

// ── Glass capsule ──────────────────────────────────────────────────────────────

function GlassCapsule({ src }: { src: string }) {
  return (
    <div className="animate-float relative mx-auto" style={{ width: 188, height: 268 }}>
      <div
        className="absolute -inset-3 rounded-[120px] blur-2xl opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, oklch(0.72 0.22 295) 0%, transparent 70%)',
        }}
      />
      <div className="relative h-full w-full overflow-hidden rounded-[120px] border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="capsule photo" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/28 via-white/5 to-transparent" />
        <div className="absolute top-8 left-10 right-10 h-px rounded-full bg-white/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
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

// ── Mint success screen ────────────────────────────────────────────────────────

function MintSuccessScreen({
  objectId,
  onNewCapsule,
  onMyPage,
}: {
  objectId: string;
  onNewCapsule: () => void;
  onMyPage: () => void;
}) {
  const t = useTranslations('create.review.success');
  const [copied, setCopied] = useState(false);
  const explorerUrl =
    NETWORK === 'testnet'
      ? `https://suiscan.xyz/testnet/object/${objectId}`
      : `https://suiscan.xyz/devnet/object/${objectId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(objectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/20 ring-1 ring-purple-400/40 text-5xl">
        💊
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card px-4 py-3 text-left space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Object ID
        </p>
        <p className="font-mono text-xs text-foreground/70 break-all leading-relaxed">
          {objectId}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          {copied ? (
            <Check className="size-4 text-primary" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? t('copied') : t('copyId')}
        </button>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-4" />
          {t('viewExplorer')}
        </a>

        <button
          onClick={onMyPage}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          {t('myPage')}
        </button>

        <button
          onClick={onNewCapsule}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t('newCapsule')}
        </button>
      </div>
    </div>
  );
}

// ── Hold-to-mint button ────────────────────────────────────────────────────────

function HoldToMintButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled: boolean;
}) {
  const t = useTranslations('create.review');
  const [progress, setProgress] = useState(0);
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
        <svg
          width="128"
          height="128"
          viewBox="0 0 120 120"
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden
        >
          <circle cx="60" cy="60" r={SVG_RADIUS} fill="none" strokeWidth="3" className="stroke-border" />
          <circle
            cx="60" cy="60" r={SVG_RADIUS} fill="none" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={SVG_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-primary"
            style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear` }}
          />
        </svg>

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
                {t('holdSealing')}
                <br />
                <span className="text-[10px] text-muted-foreground">
                  {t('holdProgress', { percent: Math.round(progress * 100) })}
                </span>
              </>
            ) : (
              <>
                {t('holdPrompt')}
              </>
            )}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t('holdHint')}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const t = useTranslations('create.review');
  const tCommon = useTranslations('common');
  const tStep1 = useTranslations('create.step1');
  const tStep2 = useTranslations('create.step2');
  const router = useRouter();
  const store = usePreMintStore();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: walletSignAndExecute } = useSignAndExecuteTransaction({
    execute: ({ bytes, signature }) =>
      getSuiClient().executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showObjectChanges: true },
      }),
  });

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
  const [mintedObjectId, setMintedObjectId] = useState<string | null>(null);

  useEffect(() => {
    if (mintedObjectId) return;
    if (!photoBlobId) router.replace('/create/photo');
    else if (!step1.category || !step1.freeText.trim()) router.replace('/create/step1');
    else if (!step2.polarity || !step2.subcategory || !step2.connection.trim())
      router.replace('/create/step2');
    else if (!step3.memo.trim()) router.replace('/create/step3');
  }, [
    mintedObjectId,
    photoBlobId,
    step1.category,
    step1.freeText,
    step2.polarity,
    step2.subcategory,
    step2.connection,
    step3.memo,
    router,
  ]);

  if (mintedObjectId) {
    return (
      <MintSuccessScreen
        objectId={mintedObjectId}
        onNewCapsule={async () => {
          await clearStep3Draft();
          reset();
          router.push('/create/photo');
        }}
        onMyPage={async () => {
          await clearStep3Draft();
          reset();
          router.push('/my');
        }}
      />
    );
  }

  if (
    !photoBlobId ||
    !step1.category ||
    !step2.polarity ||
    !step2.subcategory ||
    !step3.memo.trim()
  )
    return null;

  const handleMint = async () => {
    setMinting(true);
    setMintError(null);
    try {
      const mintInput = { photoBlobId, step1, step2, step3, eventName, fighterTag };
      let objectId: string;
      if (currentAccount) {
        const tx = buildMintTx(mintInput);
        const result = await walletSignAndExecute({ transaction: tx, chain: `sui:${NETWORK}` });
        objectId = extractCapsuleObjectId(result, currentAccount.address);
      } else {
        objectId = await mintDemo(mintInput);
      }
      setMintedObjectId(objectId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('mintErrorUnknown');
      setMintError(msg);
      toast.error(t('mintErrorUnknown'), { description: msg });
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      <button
        onClick={() => router.push('/create/step3')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {tCommon('back')}
      </button>

      {photoPreviewUrl && (
        <div className="flex flex-col items-center gap-6 py-4">
          <GlassCapsule src={photoPreviewUrl} />
          <div className="text-center">
            <p className="text-lg font-bold">{t('confirmTitle')}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('confirmHint')}</p>
          </div>
        </div>
      )}

      <div className="space-y-6 rounded-2xl border border-border bg-card/50 px-5 py-6">
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

        <SummarySection title={t('step1Label')}>
          <div className="flex flex-wrap gap-1.5">
            {step1.category && (
              <Chip label={tStep1(`categories.${step1.category}` as Parameters<typeof tStep1>[0])} />
            )}
            {step1.items.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tStep1(`subcategories.${item}` as Parameters<typeof tStep1>[0])}
              </span>
            ))}
          </div>
          {step1.freeText && (
            <p className="text-sm leading-relaxed text-foreground/80">
              &ldquo;{step1.freeText}&rdquo;
            </p>
          )}
        </SummarySection>

        <div className="h-px bg-border" />

        <SummarySection title={t('step2Label')}>
          <div className="flex flex-wrap gap-1.5">
            {step2.polarity && (
              <Chip label={tStep2(`polarity.${step2.polarity}` as Parameters<typeof tStep2>[0])} />
            )}
            {step2.subcategory && step2.polarity && (
              <Chip label={tStep2(
                `${step2.polarity === 'positive' ? 'subcategoryPositive' : 'subcategoryNegative'}.${step2.subcategory}.label` as Parameters<typeof tStep2>[0]
              )} />
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            &ldquo;{step2.connection}&rdquo;
          </p>
        </SummarySection>

        <div className="h-px bg-border" />

        <SummarySection title={t('step3Label')}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{step3.memo}</p>
        </SummarySection>
      </div>

      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive/70" />
          <blockquote className="space-y-2 text-sm leading-relaxed text-foreground/80">
            <p>{t('warningP1')}</p>
            <p>{t('warningP2')}</p>
            <p>{t('warningP3')}</p>
            <p className="font-semibold text-foreground">{t('warningP4')}</p>
          </blockquote>
        </div>
      </div>

      {currentAccount ? (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-400 text-[11px]">
            {t('walletConnected')}
          </span>
          <span className="font-mono">
            {currentAccount.address.slice(0, 6)}…{currentAccount.address.slice(-4)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-700 dark:text-yellow-400">
          <span className="font-semibold">{t('demoMode')}</span>
          <span>{t('demoModeDesc')}</span>
        </div>
      )}

      {minting ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="size-12 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">{t('minting')}</p>
        </div>
      ) : (
        <HoldToMintButton onConfirm={handleMint} disabled={minting} />
      )}

      {mintError && !minting && (
        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4">
          <p className="text-sm text-destructive">{mintError}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMint}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {tCommon('retry')}
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
                {t('faucetLink')}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
