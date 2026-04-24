// Capsule + feedback fetching utilities (client-side, uses SuiJsonRpcClient directly)

import { getSuiClient, CAPSULE_PACKAGE_ID } from './client';
import type { CapsuleData } from '@/app/[locale]/capsule/[id]/page';

// ── Stats types ───────────────────────────────────────────────────────────────

export interface CapsuleStats {
  totalViews: number;
  communicatedCount: number;  // outcome 0: 伝わった
  wantMoreCount: number;      // outcome 1: もっと知りたい
  differentCount: number;     // outcome 2: 違う解釈
  communicatedRate: number;   // 0–100 (伝わった率)
}

export interface CapsuleWithStats {
  capsule: CapsuleData;
  stats: CapsuleStats;
}

// ── Parse raw Sui object fields into CapsuleData ───────────────────────────────

function parseCapsuleFields(
  objectId: string,
  f: Record<string, unknown>,
): CapsuleData {
  return {
    id: objectId,
    photoBlobId:      String(f.photo_blob_id ?? ''),
    step1Category:    String(f.step1_category ?? ''),
    step1Items:       Array.isArray(f.step1_items)
                        ? (f.step1_items as unknown[]).map(String)
                        : [],
    step1FreeText:    String(f.step1_free_text ?? ''),
    step2Polarity:    String(f.step2_polarity ?? ''),
    step2Subcategory: String(f.step2_subcategory ?? ''),
    step2Connection:  String(f.step2_connection ?? ''),
    step3Memo:        String(f.step3_memo ?? ''),
    mintedAtMs:       Number(f.minted_at_ms ?? 0),
    eventName:        String(f.event_name ?? ''),
    fighterTag:       String(f.fighter_tag ?? ''),
    creator:          String(f.creator ?? ''),
  };
}

// ── Fetch all Capsule objects owned by an address ─────────────────────────────

const CAPSULE_STRUCT_TYPE = `${CAPSULE_PACKAGE_ID}::capsule::Capsule`;

export async function fetchOwnedCapsules(address: string): Promise<CapsuleData[]> {
  const client = getSuiClient();
  const capsules: CapsuleData[] = [];
  let cursor: string | null | undefined = undefined;

  do {
    const res = await client.getOwnedObjects({
      owner: address,
      filter: { StructType: CAPSULE_STRUCT_TYPE },
      options: { showContent: true },
      cursor,
      limit: 50,
    });

    for (const item of res.data) {
      const content = item.data?.content;
      if (!content || content.dataType !== 'moveObject') continue;
      const f = content.fields as Record<string, unknown>;
      capsules.push(parseCapsuleFields(item.data?.objectId ?? '', f));
    }

    cursor = res.hasNextPage ? res.nextCursor : undefined;
  } while (cursor);

  // Newest first
  return capsules.sort((a, b) => b.mintedAtMs - a.mintedAtMs);
}

// ── Fetch feedback stats for one capsule ──────────────────────────────────────

interface FeedbackRefRaw {
  viewer_tier: string | number;
  outcome: string | number;
  submitted_at_ms: string;
  walrus_blob_id: string;
  seal_policy_id: string;
}

const ZERO_STATS: CapsuleStats = {
  totalViews: 0,
  communicatedCount: 0,
  wantMoreCount: 0,
  differentCount: 0,
  communicatedRate: 0,
};

function getRegistryId(): string {
  return process.env.NEXT_PUBLIC_FEEDBACK_REGISTRY_ID ?? '';
}

async function getEntriesTableId(): Promise<string | null> {
  const registryId = getRegistryId();
  if (!registryId) return null;

  const client = getSuiClient();
  const res = await client.getObject({
    id: registryId,
    options: { showContent: true },
  });

  const content = res.data?.content;
  if (!content || content.dataType !== 'moveObject') return null;

  const fields = content.fields as Record<string, unknown>;
  // entries is a Table, its content is { id: { id: "0x..." }, size: "N" }
  const entries = fields.entries as { fields?: { id?: { id?: string } } } | undefined;
  return entries?.fields?.id?.id ?? null;
}

// Cache the entries table ID across calls (it's stable for a deployed registry)
let _entriesTableId: string | null | undefined;

async function resolveEntriesTableId(): Promise<string | null> {
  if (_entriesTableId !== undefined) return _entriesTableId;
  _entriesTableId = await getEntriesTableId().catch(() => null);
  return _entriesTableId;
}

export async function fetchCapsuleStats(capsuleId: string): Promise<CapsuleStats> {
  const tableId = await resolveEntriesTableId();
  if (!tableId) return ZERO_STATS;

  const client = getSuiClient();
  try {
    const dfRes = await client.getDynamicFieldObject({
      parentId: tableId,
      name: { type: '0x2::object::ID', value: capsuleId },
    });

    const content = dfRes.data?.content;
    if (!content || content.dataType !== 'moveObject') return ZERO_STATS;

    // The value is a vector<FeedbackRef> stored as the dynamic field value
    const f = content.fields as Record<string, unknown>;
    const raw = f.value as FeedbackRefRaw[] | undefined;
    if (!Array.isArray(raw) || raw.length === 0) return ZERO_STATS;

    let communicated = 0;
    let wantMore = 0;
    let different = 0;

    for (const fb of raw) {
      const outcome = Number(fb.outcome);
      if (outcome === 0) communicated++;
      else if (outcome === 1) wantMore++;
      else if (outcome === 2) different++;
    }

    const total = raw.length;
    return {
      totalViews: total,
      communicatedCount: communicated,
      wantMoreCount: wantMore,
      differentCount: different,
      communicatedRate: total > 0 ? Math.round((communicated / total) * 100) : 0,
    };
  } catch {
    return ZERO_STATS;
  }
}

// ── Fetch raw feedback refs for a capsule (for dashboard) ────────────────────

export interface FeedbackRef {
  viewerTier: number;     // 0=beginner 1=intermediate 2=hardcore
  outcome: number;        // 0=communicated 1=wantMore 2=different
  submittedAtMs: number;
  walrusBlobId: string;
  sealPolicyId: string;
}

export async function fetchFeedbackRefs(capsuleId: string): Promise<FeedbackRef[]> {
  const tableId = await resolveEntriesTableId();
  if (!tableId) return [];

  const client = getSuiClient();
  try {
    const dfRes = await client.getDynamicFieldObject({
      parentId: tableId,
      name: { type: '0x2::object::ID', value: capsuleId },
    });
    const content = dfRes.data?.content;
    if (!content || content.dataType !== 'moveObject') return [];

    const f = content.fields as Record<string, unknown>;
    const raw = f.value as FeedbackRefRaw[] | undefined;
    if (!Array.isArray(raw)) return [];

    return raw.map((fb) => ({
      viewerTier:    Number(fb.viewer_tier),
      outcome:       Number(fb.outcome),
      submittedAtMs: Number(fb.submitted_at_ms),
      walrusBlobId:  fb.walrus_blob_id,
      sealPolicyId:  fb.seal_policy_id,
    }));
  } catch {
    return [];
  }
}

// ── Fetch a single capsule (reused from capsule/[id]/page.ts) ─────────────────

export async function fetchCapsuleById(id: string): Promise<CapsuleData | null> {
  const client = getSuiClient();
  try {
    const res = await client.getObject({ id, options: { showContent: true } });
    const content = res.data?.content;
    if (!content || content.dataType !== 'moveObject') return null;
    return parseCapsuleFields(res.data?.objectId ?? id, content.fields as Record<string, unknown>);
  } catch {
    return null;
  }
}
