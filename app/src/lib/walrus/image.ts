'use client';

import { toast } from 'sonner';
import { uploadBlob, getBlobUrl } from './client';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * 画像ファイルを WebP (quality 0.8) に変換して Walrus にアップロードする。
 * - 2 MB を超える場合は変換後にエラーを throw
 * - アップロード中・成功・失敗を sonner で通知
 *
 * @returns Walrus Blob ID
 */
export async function uploadImage(file: File): Promise<string> {
  let webp: Blob;
  try {
    webp = await convertToWebP(file);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Image conversion failed';
    toast.error(msg);
    throw e;
  }

  if (webp.size > MAX_BYTES) {
    const mb = (webp.size / 1024 / 1024).toFixed(1);
    const msg = `Image too large (${mb} MB). Please use a file under 2 MB.`;
    toast.error(msg);
    throw new Error(msg);
  }

  const toastId = toast.loading('Uploading photo…');
  try {
    const { blobId } = await uploadBlob(webp);
    toast.success('Photo uploaded', { id: toastId });
    return blobId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    toast.error(msg, { id: toastId });
    throw e;
  }
}

/**
 * Walrus Blob ID から画像の公開 URL を返す。
 * aggregator エンドポイントをそのまま使う。
 */
export function getImageUrl(blobId: string): string {
  return getBlobUrl(blobId);
}

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * File を Canvas で WebP (quality 0.8) に変換して Blob を返す。
 * ブラウザ Canvas API に依存するため Client Component からのみ呼ぶこと。
 */
function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP conversion failed'));
          }
        },
        'image/webp',
        0.8,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}
