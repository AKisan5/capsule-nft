'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, TrendingUp, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getBlobUrl } from '@/lib/walrus/client';
import {
  fetchOwnedCapsules,
  fetchCapsuleStats,
  type CapsuleWithStats,
} from '@/lib/sui/capsules';
import type { CapsuleData } from '@/app/capsule/[id]/page';

// ── Loading skeleton ───────────────────────────────────────────────────────────

function CapsuleCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[4/3] bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="mt-3 flex gap-3">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ── Capsule grid card ──────────────────────────────────────────────────────────

function CapsuleCard({ capsule, stats }: { capsule: CapsuleData; stats: CapsuleWithStats['stats'] }) {
  const date = new Date(capsule.mintedAtMs).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/my/capsule/${capsule.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {capsule.photoBlobId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getBlobUrl(capsule.photoBlobId)}
            alt={`${capsule.fighterTag} — ${capsule.eventName}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No photo
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {capsule.fighterTag && (
            <span className="rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
              #{capsule.fighterTag}
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-2 p-3">
        <div>
          <p className="truncate text-sm font-medium leading-tight">
            {capsule.eventName || '無題イベント'}
          </p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="size-3" />
            {stats.totalViews}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="size-3" />
            <span
              className={
                stats.totalViews > 0 && stats.communicatedRate >= 60
                  ? 'text-primary font-medium'
                  : ''
              }
            >
              {stats.totalViews > 0 ? `${stats.communicatedRate}%` : '—'}
            </span>
          </span>
          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
            {capsule.step2Subcategory}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-4xl opacity-30">💊</div>
      <p className="text-sm font-medium">カプセルがありません</p>
      <p className="mt-1 text-xs text-muted-foreground">
        初めての感動をカプセルに封じましょう
      </p>
      <Link
        href="/create/photo"
        className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" />
        作成する
      </Link>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MyPage() {
  const router = useRouter();
  const { status, address } = useAuthStore();

  const [items, setItems] = useState<CapsuleWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === 'idle') return; // still initializing
    if (status !== 'authenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Fetch capsules + stats
  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const capsules = await fetchOwnedCapsules(address!);

        if (cancelled) return;

        // Show capsules immediately, then hydrate stats in parallel
        const withEmptyStats: CapsuleWithStats[] = capsules.map((capsule) => ({
          capsule,
          stats: {
            totalViews: 0,
            communicatedCount: 0,
            wantMoreCount: 0,
            differentCount: 0,
            communicatedRate: 0,
          },
        }));
        setItems(withEmptyStats);
        setLoading(false);

        // Fetch stats for all capsules in parallel
        const statsResults = await Promise.allSettled(
          capsules.map((c) => fetchCapsuleStats(c.id)),
        );

        if (cancelled) return;

        setItems(
          capsules.map((capsule, i) => ({
            capsule,
            stats:
              statsResults[i].status === 'fulfilled'
                ? statsResults[i].value
                : withEmptyStats[i].stats,
          })),
        );
      } catch (err) {
        if (!cancelled) {
          console.error('[my] fetch failed:', err);
          setError('カプセルの取得に失敗しました');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [address]);

  // ── Aggregate totals ──────────────────────────────────────────────────────

  const totalViews = items.reduce((s, i) => s + i.stats.totalViews, 0);
  const avgRate =
    items.length > 0
      ? Math.round(
          items.reduce((s, i) => s + i.stats.communicatedRate, 0) / items.length,
        )
      : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (status !== 'authenticated' && status !== 'idle') return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-base font-semibold">マイカプセル</h1>
            {!loading && items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {items.length} 個 · 計 {totalViews} 閲覧 · 平均伝達率 {avgRate}%
              </p>
            )}
          </div>
          <Link
            href="/create/photo"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" />
            新規作成
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CapsuleCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-xs text-muted-foreground underline"
            >
              再読み込み
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map(({ capsule, stats }) => (
              <CapsuleCard key={capsule.id} capsule={capsule} stats={stats} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
