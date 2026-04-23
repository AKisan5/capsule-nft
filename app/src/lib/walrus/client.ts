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
 * @param data アップロードするバイナリデータ
 * @param epochs 保存 epoch 数 (デフォルト: 5)
 */
export async function uploadBlob(
  data: Blob | Uint8Array,
  epochs = 5,
): Promise<UploadResult> {
  // Uint8Array<ArrayBufferLike> → Blob: structuredClone でコピーしてから渡す
  const body =
    data instanceof Uint8Array
      ? new Blob([new Uint8Array(data)])
      : data;
  const url = `${getPublisherUrl()}/v1/blobs?epochs=${epochs}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'PUT', body });
  } catch (cause) {
    throw new Error('Walrus publisher に接続できません', { cause });
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
    throw new Error('Walrus: レスポンスの JSON パースに失敗しました');
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
  throw new Error('Walrus: 予期しないレスポンス形式です');
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
    throw new Error('Walrus aggregator に接続できません', { cause });
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
