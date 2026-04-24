'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from '@/i18n/navigation';
import { getBlobUrl } from '@/lib/walrus/client';
import {
  getViewerProfile,
  saveViewerProfile,
  type ViewerProfile,
} from '@/lib/seal/profile';
import { ViewerProfileModal } from '@/components/ViewerProfileModal';
import { NETWORK } from '@/lib/sui/client';
import type { CapsuleData } from './page';
import type { TranslateResponse } from '@/app/api/translate/route';

// ── Translation section ───────────────────────────────────────────────────────

function TranslationCard({ translation }: { translation: TranslateResponse }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold leading-snug tracking-tight">
        {translation.headline}
      </h1>
      <p className="text-base leading-relaxed text-foreground/90">
        {translation.bridge}
      </p>
      <blockquote className="border-l-2 border-primary pl-4 text-sm text-muted-foreground italic leading-relaxed">
        {translation.essence}
      </blockquote>
    </div>
  );
}

function TranslationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-3/4 rounded-lg bg-muted" />
      <div className="space-y-2">
        <div className="h-4 rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/6 rounded bg-muted" />
      </div>
      <div className="h-4 w-2/3 rounded bg-muted/60" />
    </div>
  );
}

// ── Collapsible raw memo ───────────────────────────────────────────────────────

function RawCapsule({ capsule }: { capsule: CapsuleData }) {
  const t = useTranslations('capsule');
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-medium text-muted-foreground">
          {open ? t('rawMemoHide') : t('rawMemoToggle')}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border bg-muted/10 px-5 py-5 space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('step1Label')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {capsule.step1Category}
              </span>
              {capsule.step1Items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
            {capsule.step1FreeText && (
              <p className="text-sm text-foreground/80 leading-relaxed">
                &ldquo;{capsule.step1FreeText}&rdquo;
              </p>
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('step2Label')}
            </p>
            <div className="flex gap-1.5">
              <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {capsule.step2Polarity}
              </span>
              <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {capsule.step2Subcategory}
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              &ldquo;{capsule.step2Connection}&rdquo;
            </p>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('step3Label')}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {capsule.step3Memo}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Copy URL button ────────────────────────────────────────────────────────────

function CopyUrlButton() {
  const t = useTranslations('capsule');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
    >
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? t('urlCopied') : t('copyUrl')}
    </button>
  );
}

// ── Mint success overlay ──────────────────────────────────────────────────────

function MintSuccessOverlay({
  capsuleId,
  onClose,
}: {
  capsuleId: string;
  onClose: () => void;
}) {
  const t = useTranslations('capsule');
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const explorerUrl =
    NETWORK === 'testnet'
      ? `https://suiscan.xyz/testnet/object/${capsuleId}`
      : `https://suiscan.xyz/devnet/object/${capsuleId}`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    router.replace(shareUrl, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0d1a] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, oklch(0.65 0.28 295) 0%, transparent 70%)',
          }}
        />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-white/40 hover:text-white/80 transition-colors"
          aria-label={t('close')}
        >
          <X className="size-4" />
        </button>

        <div className="relative px-6 pt-10 pb-7 space-y-6 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/20 ring-1 ring-purple-400/40 text-4xl">
            💊
          </div>

          <div className="space-y-1.5">
            <p className="text-2xl font-bold tracking-tight text-white">
              {t('mintSuccess.title')}
            </p>
            <p className="text-sm text-white/60">
              {t('mintSuccess.description')}
            </p>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-left space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Object ID
            </p>
            <p className="font-mono text-xs text-white/70 break-all leading-relaxed">
              {capsuleId}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              {copied ? (
                <Check className="size-4 text-emerald-400" />
              ) : (
                <Share2 className="size-4" />
              )}
              {copied ? t('shareCopied') : t('share')}
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              <ExternalLink className="size-4" />
              {t('viewExplorer')}
            </a>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('viewCapsule')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CapsuleViewer ─────────────────────────────────────────────────────────

export function CapsuleViewer({
  capsule,
  justMinted = false,
}: {
  capsule: CapsuleData;
  justMinted?: boolean;
}) {
  const t = useTranslations('capsule');
  const account = useCurrentAccount();
  const address = account?.address ?? null;

  const [showSuccess, setShowSuccess] = useState(justMinted);
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [translation, setTranslation] = useState<TranslateResponse | null>(null);
  const [translating, setTranslating] = useState(false);

  const photoUrl = getBlobUrl(capsule.photoBlobId);

  useEffect(() => {
    const existing = getViewerProfile(address);
    if (existing) {
      setProfile(existing);
    } else {
      setShowModal(true);
    }
  }, [address]);

  const fetchTranslation = useCallback(
    async (p: ViewerProfile) => {
      setTranslating(true);
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capsule: {
              step1Category:    capsule.step1Category,
              step1Items:       capsule.step1Items,
              step1FreeText:    capsule.step1FreeText,
              step2Polarity:    capsule.step2Polarity,
              step2Subcategory: capsule.step2Subcategory,
              step2Connection:  capsule.step2Connection,
              step3Memo:        capsule.step3Memo,
              eventName:        capsule.eventName,
              fighterTag:       capsule.fighterTag,
            },
            profile: p,
          }),
        });
        if (!res.ok) throw new Error(`translate API ${res.status}`);
        setTranslation((await res.json()) as TranslateResponse);
      } catch (err) {
        console.error('[CapsuleViewer] translation failed:', err);
        toast.error(t('translateFailed'), { description: t('translateFailedDesc') });
      } finally {
        setTranslating(false);
      }
    },
    [capsule, t],
  );

  useEffect(() => {
    if (profile) fetchTranslation(profile);
  }, [profile, fetchTranslation]);

  const handleProfileSubmit = async (p: ViewerProfile) => {
    setShowModal(false);
    setProfile(p);
    await saveViewerProfile(address, p).catch((err) => {
      console.warn('[CapsuleViewer] profile save failed:', err);
    });
  };

  const mintDate = new Date(capsule.mintedAtMs).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const creatorShort = `${capsule.creator.slice(0, 6)}…${capsule.creator.slice(-4)}`;

  return (
    <>
      {showSuccess && (
        <MintSuccessOverlay
          capsuleId={capsule.id}
          onClose={() => setShowSuccess(false)}
        />
      )}

      <ViewerProfileModal
        open={showModal}
        fighterTag={capsule.fighterTag}
        onSubmit={handleProfileSubmit}
      />

      <div className="min-h-screen">
        <div className="relative h-72 w-full overflow-hidden sm:h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={`${capsule.fighterTag} — ${capsule.eventName}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />

          <div className="absolute bottom-4 left-4 flex flex-wrap items-end gap-2">
            {capsule.eventName && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                {capsule.eventName}
              </span>
            )}
            {capsule.fighterTag && (
              <span className="rounded-full bg-primary/80 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
                #{capsule.fighterTag}
              </span>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-lg space-y-8 px-4 py-8">
          <section>
            {translating ? (
              <TranslationSkeleton />
            ) : translation ? (
              <TranslationCard translation={translation} />
            ) : !showModal ? (
              <p className="text-sm text-muted-foreground">{t('translating')}</p>
            ) : null}
          </section>

          {!showModal && <RawCapsule capsule={capsule} />}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">
                {t('mintedOn', { date: mintDate })}
              </p>
              <p>
                {t('creator')}{' '}
                <span className="font-mono">{creatorShort}</span>
              </p>
            </div>
            <CopyUrlButton />
          </div>
        </div>
      </div>
    </>
  );
}
