'use client';

// Viewer profile — encrypted with @mysten/seal, stored on Walrus, registered on-chain.
// Falls back to localStorage when Seal is not configured (dev environments).

import { SealClient, SessionKey, type SealCompatibleClient } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { fromHex } from '@mysten/sui/utils';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { uploadBlob, downloadBlob } from '@/lib/walrus/client';
import { NETWORK, CAPSULE_PACKAGE_ID } from '@/lib/sui/client';
import type { ZkLoginSession } from '@/lib/sui/zklogin';

// ── Types ──────────────────────────────────────────────────────────────────────

/** 5-level scale shared by Q1, Q2, Q3 */
export type FiveLevel = '1' | '2' | '3' | '4' | '5';

export interface ViewerProfile {
  /** Q1: この選手についての知識量 (1=全く知らない → 5=熟知している) */
  fighterKnowledge: FiveLevel;
  /** Q2: この選手への印象 (1=無関心 → 5=大ファン) */
  fighterImpression: FiveLevel;
  /** Q3: ONE Championship / MMA 全般の知識 (1=初めて → 5=マニア) */
  mmaKnowledge: FiveLevel;
  /** Q4: 自由記述 (任意) */
  selfIntro?: string;
}

// ── Env config ─────────────────────────────────────────────────────────────────

function getKeyServerIds(): string[] {
  const raw =
    typeof process !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_IDS ?? '')
      : '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getProfileRegistryId(): string {
  return typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID ?? '')
    : '';
}

function sealEnabled(): boolean {
  return getKeyServerIds().length > 0 && !!getProfileRegistryId() && !!CAPSULE_PACKAGE_ID;
}

// ── Sui client ─────────────────────────────────────────────────────────────────

function makeSuiClient(): SuiJsonRpcClient {
  const url =
    NETWORK === 'testnet'
      ? 'https://fullnode.testnet.sui.io:443'
      : 'https://fullnode.devnet.sui.io:443';
  return new SuiJsonRpcClient({ url, network: NETWORK });
}

// SuiJsonRpcClient extends BaseClient which has `core: CoreClient` — structurally
// compatible with SealCompatibleClient at runtime.
function asSealClient(suiClient: SuiJsonRpcClient): SealCompatibleClient {
  return suiClient as unknown as SealCompatibleClient;
}

// ── Seal identity ──────────────────────────────────────────────────────────────

// The Move seal_approve uses `sui::bcs::to_bytes(&ctx.sender())` = 32 raw bytes.
// Seal's `id` param is a hex string (without 0x prefix, 64 chars).
function sealId(address: string): string {
  const stripped = address.startsWith('0x') ? address.slice(2) : address;
  return stripped.padStart(64, '0');
}

// ── localStorage helpers ───────────────────────────────────────────────────────

function localKey(viewer: string): string {
  return `capsule_viewer_profile_v2_${viewer}`;
}

function localGet(viewer: string): ViewerProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(localKey(viewer));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ViewerProfile;
  } catch {
    return null;
  }
}

function localSet(viewer: string, profile: ViewerProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(localKey(viewer), JSON.stringify(profile));
}

// ── Seal encrypt → Walrus upload → on-chain register ─────────────────────────

async function encryptAndUpload(
  viewer: string,
  profile: ViewerProfile,
  session: ZkLoginSession,
): Promise<void> {
  const suiClient = makeSuiClient();
  const keyServerIds = getKeyServerIds();

  const sealClient = new SealClient({
    suiClient: asSealClient(suiClient),
    serverConfigs: keyServerIds.map((id) => ({ objectId: id, weight: 1 })),
  });

  const profileBytes = new TextEncoder().encode(JSON.stringify(profile));

  const { encryptedObject } = await sealClient.encrypt({
    threshold: Math.ceil(keyServerIds.length / 2),
    packageId: CAPSULE_PACKAGE_ID,
    id: sealId(viewer),
    data: profileBytes,
  });

  const { blobId } = await uploadBlob(encryptedObject, 5);

  // Register viewer → blobId on-chain
  const tx = new Transaction();
  tx.moveCall({
    target: `${CAPSULE_PACKAGE_ID}::profile_registry::register_profile`,
    arguments: [
      tx.object(getProfileRegistryId()),
      tx.pure.string(blobId),
    ],
  });

  const { zkLoginSignAndExecute } = await import('@/lib/sui/zklogin');
  await zkLoginSignAndExecute(tx, session);
}

// ── On-chain blobId lookup ─────────────────────────────────────────────────────

async function fetchBlobIdOnChain(viewer: string): Promise<string | null> {
  const registryId = getProfileRegistryId();
  if (!registryId) return null;

  const suiClient = makeSuiClient();
  try {
    // The profiles field is a Sui Table — look up via dynamic field
    const res = await suiClient.getObject({
      id: registryId,
      options: { showContent: true },
    });
    const content = res.data?.content;
    if (!content || content.dataType !== 'moveObject') return null;

    const fields = content.fields as Record<string, unknown>;
    const profilesId = (fields.profiles as { id: { id: string } } | undefined)?.id?.id;
    if (!profilesId) return null;

    const dfRes = await suiClient.getDynamicFieldObject({
      parentId: profilesId,
      name: { type: 'address', value: viewer },
    });
    const dfContent = dfRes.data?.content;
    if (!dfContent || dfContent.dataType !== 'moveObject') return null;
    const dfFields = dfContent.fields as Record<string, unknown>;
    const blobId = String(dfFields.value ?? '');
    return blobId || null;
  } catch {
    return null;
  }
}

// ── Seal decrypt ──────────────────────────────────────────────────────────────

async function decryptFromWalrus(
  blobId: string,
  viewer: string,
  session: ZkLoginSession,
): Promise<ViewerProfile> {
  const suiClient = makeSuiClient();
  const keyServerIds = getKeyServerIds();

  const sealClient = new SealClient({
    suiClient: asSealClient(suiClient),
    serverConfigs: keyServerIds.map((id) => ({ objectId: id, weight: 1 })),
  });

  const encryptedBytes = await downloadBlob(blobId);

  const { secretKey: secretKeyBytes } = decodeSuiPrivateKey(session.ephemeralSecretKey);
  const ephemeralKeypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);

  const sessionKey = await SessionKey.create({
    address: viewer,
    packageId: CAPSULE_PACKAGE_ID,
    ttlMin: 10,
    suiClient: asSealClient(suiClient),
  });

  const { signature } = await ephemeralKeypair.signPersonalMessage(
    sessionKey.getPersonalMessage(),
  );
  await sessionKey.setPersonalMessageSignature(signature);

  // PTB calling seal_approve so Seal key servers can verify access
  const idBytes = fromHex(sealId(viewer));
  const tx = new Transaction();
  tx.moveCall({
    target: `${CAPSULE_PACKAGE_ID}::profile_registry::seal_approve`,
    arguments: [tx.pure.vector('u8', Array.from(idBytes))],
  });
  tx.setSender(viewer);
  const txBytes = await tx.build({ client: suiClient });

  const decrypted = await sealClient.decrypt({
    data: encryptedBytes,
    sessionKey,
    txBytes,
  });

  return JSON.parse(new TextDecoder().decode(decrypted)) as ViewerProfile;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Synchronous read from localStorage (fast path for initial render).
 * Keyed by viewer address so the same person gets one profile across all capsules.
 */
export function getViewerProfile(viewer: string | null): ViewerProfile | null {
  if (typeof window === 'undefined' || !viewer) return null;
  return localGet(viewer);
}

/**
 * Save profile to localStorage immediately, then async Seal+Walrus if configured.
 * @param session Required for Seal path; omit to force localStorage-only.
 */
export async function saveViewerProfile(
  viewer: string | null,
  profile: ViewerProfile,
  session?: ZkLoginSession | null,
): Promise<void> {
  if (!viewer) return;

  localSet(viewer, profile);

  if (!sealEnabled() || !session) return;

  try {
    await encryptAndUpload(viewer, profile, session);
  } catch (err) {
    console.warn('[profile] Seal upload failed, using localStorage only:', err);
  }
}

/**
 * Full async read: checks on-chain registry → Walrus → Seal decrypt.
 * Falls back to localStorage if Seal is not configured or fails.
 */
export async function readProfile(
  viewer: string | null,
  session?: ZkLoginSession | null,
): Promise<ViewerProfile | null> {
  if (typeof window === 'undefined' || !viewer) return null;

  if (!sealEnabled() || !session) return localGet(viewer);

  try {
    const blobId = await fetchBlobIdOnChain(viewer);
    if (!blobId) return localGet(viewer);
    return await decryptFromWalrus(blobId, viewer, session);
  } catch (err) {
    console.warn('[profile] Seal read failed, falling back to localStorage:', err);
    return localGet(viewer);
  }
}
