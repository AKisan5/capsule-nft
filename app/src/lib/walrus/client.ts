// Walrus HTTP API クライアント。
// @mysten/walrus SDK は未公開のため Publisher/Aggregator REST API を直接使用する。

// ─── 環境変数 ──────────────────────────────────────────────────────────────

function getPublisherUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WALRUS_PUBLISHER ??
    'https://publisher.walrus-testnet.walrus.space'
  );
}

function getAggregatorUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR ??
    'https://aggregator.walrus-testnet.walrus.space'
  );
}

// ─── Walrus API レスポンス型 ────────────────────────────────────────────────

interface WalrusBlobObject {
  id: string;
  blobId: string;
  size: number;
  storedEpoch: number;
  certifiedEpoch?: number;
}

type WalrusUploadResponse =
  | { newlyCreated: { blobObject: WalrusBlobObject; encodedSize: number; cost: number } }
  | { alreadyCertified: { blobId: string; endEpoch: number } };

// ─── Public API ────────────────────────────────────────────────────────────

export interface UploadResult {
  /** Walrus が割り当てた Blob ID */
  blobId: string;
  /** Sui オブジェクト ID (新規アップロード時のみ) */
  objectId?: string;
}

/**
 * Blob を Walrus Publisher にアップロードする。
 * ブラウザから呼ぶ場合は CORS 回避のため /api/walrus/upload 経由でプロキシする。
 * @param data アップロードするバイナリデータ
 * @param epochs 保存 epoch 数 (デフォルト: 5)
 */
export async function uploadBlob(
  data: Blob | Uint8Array,
  epochs = 5,
): Promise<UploadResult> {
  const body =
    data instanceof Uint8Array ? new Blob([new Uint8Array(data)]) : data;

  // ブラウザ環境ではサーバー側プロキシ経由 (CORS 対策)
  // Node 環境 (Route Handler など) では直接 publisher に投げる
  const isBrowser = typeof window !== 'undefined';
  const url = isBrowser
    ? `/api/walrus/upload?epochs=${epochs}`
    : `${getPublisherUrl()}/v1/blobs?epochs=${epochs}`;
  const method = isBrowser ? 'POST' : 'PUT';

  let res: Response;
  try {
    res = await fetch(url, { method, body });
  } catch (cause) {
    throw new Error('Cannot reach Walrus publisher', { cause });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Walrus upload failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`,
    );
  }

  let json: WalrusUploadResponse;
  try {
    json = (await res.json()) as WalrusUploadResponse;
  } catch {
    throw new Error('Walrus: failed to parse response JSON');
  }

  if ('newlyCreated' in json) {
    return {
      blobId: json.newlyCreated.blobObject.blobId,
      objectId: json.newlyCreated.blobObject.id,
    };
  }
  if ('alreadyCertified' in json) {
    return { blobId: json.alreadyCertified.blobId };
  }
  throw new Error('Walrus: unexpected response format');
}

/**
 * Walrus Aggregator から Blob をダウンロードする。
 * @param blobId Walrus Blob ID
 */
export async function downloadBlob(blobId: string): Promise<Uint8Array> {
  const url = `${getAggregatorUrl()}/v1/blobs/${blobId}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (cause) {
    throw new Error('Cannot reach Walrus aggregator', { cause });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Walrus download failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`,
    );
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Aggregator の公開 URL を返す (img src / fetch に使用)。
 */
export function getBlobUrl(blobId: string): string {
  return `${getAggregatorUrl()}/v1/blobs/${blobId}`;
}
