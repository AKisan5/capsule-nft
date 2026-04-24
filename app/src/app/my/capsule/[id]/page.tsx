'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { getBlobUrl, downloadBlob } from '@/lib/walrus/client';
import {
  fetchCapsuleById,
  fetchCapsuleStats,
  fetchFeedbackRefs,
  type CapsuleStats,
  type FeedbackRef,
} from '@/lib/sui/capsules';
import type { CapsuleData } from '@/app/capsule/[id]/page';
import type { PatternRequest, PatternResponse } from '@/app/api/pattern/route';

// ── Constants ──────────────────────────────────────────────────────────────────

const TIER_LABEL = ['初心者', '中級者', '上級者'] as const;
const TIER_COLOR = ['#a78bfa', '#60a5fa', '#34d399'] as const; // violet, sky, emerald

const OUTCOME_LABEL = ['伝わった', 'もっと知りたい', '違う解釈'] as const;
const OUTCOME_COLOR = ['var(--color-primary)', '#38bdf8', '#94a3b8'] as const;

// ── Derived feedback type (after optional decryption) ─────────────────────────

interface DecodedFeedback extends FeedbackRef {
  text?: string;       // decrypted body; undefined = blob missing / decrypt failed
  decoding: 'ok' | 'no-blob' | 'failed' | 'pending';
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${highlight ? 'text-primary' : ''}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Tier breakdown chart ───────────────────────────────────────────────────────

function TierChart({ feedbacks }: { feedbacks: FeedbackRef[] }) {
  const data = [0, 1, 2].map((tier) => {
    const subset = feedbacks.filter((f) => f.viewerTier === tier);
    return {
      name: TIER_LABEL[tier],
      伝わった:           subset.filter((f) => f.outcome === 0).length,
      'もっと知りたい':   subset.filter((f) => f.outcome === 1).length,
      '違う解釈':         subset.filter((f) => f.outcome === 2).length,
    };
  });

  const hasData = feedbacks.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        閲覧者層別リアクション
      </p>
      {!hasData ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          まだフィードバックがありません
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              width={20}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                fontSize: 12,
              }}
              cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            <Bar dataKey="伝わった"         fill={OUTCOME_COLOR[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="もっと知りたい"   fill={OUTCOME_COLOR[1]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="違う解釈"         fill={OUTCOME_COLOR[2]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── 伝わった率 per tier (horizontal bars) ─────────────────────────────────────

function CommunicationRateByTier({ feedbacks }: { feedbacks: FeedbackRef[] }) {
  const rows = [0, 1, 2].map((tier) => {
    const subset = feedbacks.filter((f) => f.viewerTier === tier);
    const rate =
      subset.length > 0
        ? Math.round((subset.filter((f) => f.outcome === 0).length / subset.length) * 100)
        : null;
    return { tier, rate, count: subset.length };
  });

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        層別 伝わった率
      </p>
      <div className="space-y-3">
        {rows.map(({ tier, rate, count }) => (
          <div key={tier} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: TIER_COLOR[tier] }}>{TIER_LABEL[tier]}</span>
              <span className="tabular-nums text-muted-foreground">
                {rate !== null ? `${rate}%` : '—'}{' '}
                <span className="text-[10px]">({count}件)</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: rate !== null ? `${rate}%` : '0%',
                  background: TIER_COLOR[tier],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Individual feedback card ───────────────────────────────────────────────────

function FeedbackCard({ fb, index }: { fb: DecodedFeedback; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(fb.submittedAtMs).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-border bg-card/50">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Tier badge */}
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `${TIER_COLOR[fb.viewerTier]}22`, color: TIER_COLOR[fb.viewerTier] }}
        >
          {TIER_LABEL[fb.viewerTier]}
        </span>

        {/* Outcome badge */}
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          {OUTCOME_LABEL[fb.outcome]}
        </span>

        <span className="ml-auto text-[10px] text-muted-foreground">{date}</span>

        {expanded ? (
          <ChevronUp className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {fb.decoding === 'pending' && (
            <p className="text-xs text-muted-foreground animate-pulse">復号中…</p>
          )}
          {fb.decoding === 'no-blob' && (
            <p className="text-xs text-muted-foreground">テキストなし</p>
          )}
          {fb.decoding === 'failed' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LockKeyhole className="size-3.5" />
              復号できませんでした
            </div>
          )}
          {fb.decoding === 'ok' && fb.text && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{fb.text}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pattern section ────────────────────────────────────────────────────────────

function PatternSection({
  pattern,
  loading,
}: {
  pattern: PatternResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-2xl border border-border bg-card px-4 py-5">
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    );
  }

  if (!pattern) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <p className="text-sm font-semibold">このカプセルから学んだパターン</p>
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed text-foreground/90">{pattern.summary}</p>

      {/* Tier insights */}
      {pattern.tierInsights.length > 0 && (
        <div className="space-y-2">
          {pattern.tierInsights.map((insight) => (
            <div key={insight.tier} className="flex gap-2 text-xs">
              <span className="shrink-0 font-medium text-primary">{insight.label}</span>
              <span className="text-muted-foreground">{insight.insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* Effective expressions */}
      {pattern.effectiveExpressions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            効いた表現
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pattern.effectiveExpressions.map((expr) => (
              <span
                key={expr}
                className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {expr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ineffective vocabulary */}
      {pattern.ineffectiveVocabulary.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            響かなかった語彙
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pattern.ineffectiveVocabulary.map((vocab) => (
              <span
                key={vocab}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground line-through"
              >
                {vocab}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Share row ──────────────────────────────────────────────────────────────────

function ShareRow({ capsuleId }: { capsuleId: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/capsule/${capsuleId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="flex flex-1 items-center gap-2 overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        {copied ? (
          <Check className="size-3.5 shrink-0 text-primary" />
        ) : (
          <Copy className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{publicUrl}</span>
      </button>
      <Link
        href={`/capsule/${capsuleId}`}
        target="_blank"
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        <ExternalLink className="size-3.5" />
        開く
      </Link>
    </div>
  );
}

// ── Capsule detail (Step 1-3) ──────────────────────────────────────────────────

function CapsuleDetail({ capsule }: { capsule: CapsuleData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-medium">原液メモ</span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border bg-muted/10 px-4 py-4 space-y-4">
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Step 1 — 瞬間
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
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
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">
                "{capsule.step1FreeText}"
              </p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Step 2 — 感情
            </p>
            <div className="flex gap-1.5">
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {capsule.step2Polarity}
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {capsule.step2Subcategory}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">
              "{capsule.step2Connection}"
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Step 3 — 原液メモ
            </p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{capsule.step3Memo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CapsuleDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const account = useCurrentAccount();
  const address = account?.address ?? null;

  const [capsule, setCapsule] = useState<CapsuleData | null>(null);
  const [stats, setStats] = useState<CapsuleStats | null>(null);
  const [feedbacks, setFeedbacks] = useState<DecodedFeedback[]>([]);
  const [pattern, setPattern] = useState<PatternResponse | null>(null);

  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingPattern, setLoadingPattern] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

  // Auth guard
  useEffect(() => {
    if (account === undefined) return; // dapp-kit hydrating
    if (!account) router.replace('/login');
  }, [account, router]);

  // ── Decrypt a single feedback blob ────────────────────────────────────────

  const decryptFeedback = useCallback(
    async (fb: FeedbackRef): Promise<DecodedFeedback> => {
      if (!fb.walrusBlobId) return { ...fb, decoding: 'no-blob' };

      try {
        const bytes = await downloadBlob(fb.walrusBlobId);
        // Seal key servers not yet configured — treat blobs as raw UTF-8
        const text = new TextDecoder().decode(bytes);
        return { ...fb, text, decoding: 'ok' };
      } catch {
        return { ...fb, decoding: 'failed' };
      }
    },
    [],
  );

  // ── Main data fetch ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    async function load() {
      setLoadingMain(true);
      try {
        const [cap, s, refs] = await Promise.all([
          fetchCapsuleById(id),
          fetchCapsuleStats(id),
          fetchFeedbackRefs(id),
        ]);

        if (cancelled) return;
        if (!cap) { router.replace('/my'); return; }
        if (cap.creator.toLowerCase() !== address!.toLowerCase()) setNotOwner(true);

        setCapsule(cap);
        setStats(s);
        setLoadingMain(false);

        // Initialise feedbacks with 'pending' state, then decrypt each
        const pending: DecodedFeedback[] = refs.map((r) => ({ ...r, decoding: 'pending' }));
        setFeedbacks(pending);

        const decoded = await Promise.all(refs.map(decryptFeedback));
        if (!cancelled) setFeedbacks(decoded);
      } catch (err) {
        console.error('[dashboard] load error:', err);
        if (!cancelled) {
          toast.error('データの取得に失敗しました');
          setLoadingMain(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, address, router, decryptFeedback]);

  // ── Pattern fetch (after feedbacks decoded) ───────────────────────────────

  useEffect(() => {
    if (!capsule || feedbacks.length === 0) return;
    if (feedbacks.some((f) => f.decoding === 'pending')) return; // wait for decryption

    let cancelled = false;
    setLoadingPattern(true);

    async function fetchPattern() {
      const body: PatternRequest = {
        capsule: {
          step1Category:   capsule!.step1Category,
          step2Subcategory: capsule!.step2Subcategory,
          step2Connection:  capsule!.step2Connection,
          step3Memo:        capsule!.step3Memo,
          eventName:        capsule!.eventName,
          fighterTag:       capsule!.fighterTag,
        },
        feedbacks: feedbacks.map((f) => ({
          tier:    f.viewerTier as 0 | 1 | 2,
          outcome: f.outcome as 0 | 1 | 2,
          text:    f.text,
        })),
      };

      try {
        const res = await fetch('/api/pattern', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`pattern API ${res.status}`);
        const data = (await res.json()) as PatternResponse;
        if (!cancelled) setPattern(data);
      } catch (err) {
        console.error('[dashboard] pattern error:', err);
      } finally {
        if (!cancelled) setLoadingPattern(false);
      }
    }

    fetchPattern();
    return () => { cancelled = true; };
  }, [capsule, feedbacks]);

  // ── Render ────────────────────────────────────────────────────────────────

  const mintDate = capsule
    ? new Date(capsule.mintedAtMs).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen pb-16">
      {/* Nav */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <Link
            href="/my"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="truncate text-sm font-semibold">
            {capsule?.eventName || 'カプセル詳細'}
          </h1>
        </div>
      </div>

      {loadingMain ? (
        <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="aspect-[4/3] rounded-2xl bg-muted" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted" />)}
            </div>
            <div className="h-56 rounded-2xl bg-muted" />
          </div>
        </div>
      ) : notOwner ? (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">このカプセルにはアクセスできません</p>
          <Link href="/my" className="mt-4 inline-block text-xs text-primary underline">
            マイカプセルに戻る
          </Link>
        </div>
      ) : capsule && stats ? (
        <div className="mx-auto max-w-lg space-y-5 px-4 py-6">

          {/* Hero */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {capsule.photoBlobId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getBlobUrl(capsule.photoBlobId)}
                alt={`${capsule.fighterTag} — ${capsule.eventName}`}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
              {capsule.eventName && (
                <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white/90 backdrop-blur-sm">
                  {capsule.eventName}
                </span>
              )}
              {capsule.fighterTag && (
                <span className="rounded-full bg-primary/80 px-2.5 py-0.5 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
                  #{capsule.fighterTag}
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="リアクション数"
              value={stats.totalViews}
              sub="フィードバック計"
            />
            <StatCard
              label="伝わった率"
              value={stats.totalViews > 0 ? `${stats.communicatedRate}%` : '—'}
              sub={stats.totalViews > 0 ? `${stats.communicatedCount} 件` : 'データなし'}
              highlight={stats.totalViews > 0 && stats.communicatedRate >= 60}
            />
            <StatCard
              label="ミント日"
              value={mintDate.replace(/\d{4}年/, '')}
              sub={mintDate.match(/\d{4}年/)?.[0] ?? ''}
            />
          </div>

          {/* Charts */}
          <TierChart feedbacks={feedbacks} />
          <CommunicationRateByTier feedbacks={feedbacks} />

          {/* Pattern analysis */}
          <PatternSection pattern={pattern} loading={loadingPattern} />

          {/* Feedback list */}
          {feedbacks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                フィードバック詳細 ({feedbacks.length}件)
              </p>
              {feedbacks.map((fb, i) => (
                <FeedbackCard key={i} fb={fb} index={i} />
              ))}
            </div>
          )}

          {/* Capsule content */}
          <CapsuleDetail capsule={capsule} />

          {/* Share */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              共有リンク
            </p>
            <ShareRow capsuleId={capsule.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
