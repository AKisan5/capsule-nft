import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadBlob, downloadBlob, getBlobUrl } from '../client';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 200): Response {
  const init: ResponseInit = { status };
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return new Response(body as ArrayBuffer, init);
  }
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── uploadBlob ────────────────────────────────────────────────────────────

describe('uploadBlob', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns blobId + objectId for newlyCreated response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      makeResponse({
        newlyCreated: {
          blobObject: { blobId: 'blob-abc', id: 'obj-xyz', size: 3, storedEpoch: 0 },
          encodedSize: 3,
          cost: 100,
        },
      }),
    );

    const result = await uploadBlob(new Uint8Array([1, 2, 3]));
    expect(result.blobId).toBe('blob-abc');
    expect(result.objectId).toBe('obj-xyz');
  });

  it('returns only blobId for alreadyCertified response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      makeResponse({
        alreadyCertified: { blobId: 'blob-existing', endEpoch: 10 },
      }),
    );

    const result = await uploadBlob(new Uint8Array([1, 2, 3]));
    expect(result.blobId).toBe('blob-existing');
    expect(result.objectId).toBeUndefined();
  });

  it('accepts Blob as input', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      makeResponse({
        newlyCreated: {
          blobObject: { blobId: 'blob-from-blob', id: 'obj-1', size: 5, storedEpoch: 0 },
          encodedSize: 5,
          cost: 50,
        },
      }),
    );

    const blob = new Blob([new Uint8Array([1, 2, 3, 4, 5])]);
    const result = await uploadBlob(blob);
    expect(result.blobId).toBe('blob-from-blob');
  });

  it('passes custom epochs in the URL', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      makeResponse({
        newlyCreated: {
          blobObject: { blobId: 'b1', id: 'o1', size: 1, storedEpoch: 0 },
          encodedSize: 1,
          cost: 10,
        },
      }),
    );

    await uploadBlob(new Uint8Array([0]), 20);
    expect(fetchSpy.mock.calls[0][0]).toContain('epochs=20');
  });

  it('throws on HTTP 503 without swallowing details', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 }),
    );

    await expect(uploadBlob(new Uint8Array([1]))).rejects.toThrow('503');
  });

  it('throws on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(uploadBlob(new Uint8Array([1]))).rejects.toThrow('Cannot reach Walrus publisher');
  });

  it('throws on unexpected JSON shape', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      makeResponse({ unexpected: true }),
    );

    await expect(uploadBlob(new Uint8Array([1]))).rejects.toThrow('unexpected response format');
  });
});

// ─── downloadBlob ──────────────────────────────────────────────────────────

describe('downloadBlob', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns Uint8Array matching the response body', async () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeResponse(data.buffer));

    const result = await downloadBlob('some-blob-id');
    expect(result).toEqual(data);
  });

  it('throws on HTTP 404', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    await expect(downloadBlob('nonexistent')).rejects.toThrow('404');
  });

  it('throws on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(downloadBlob('any-id')).rejects.toThrow('Cannot reach Walrus aggregator');
  });

  it('round-trip: upload then download returns identical bytes', async () => {
    const original = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    vi.spyOn(global, 'fetch')
      // 1st call: upload
      .mockResolvedValueOnce(
        makeResponse({
          newlyCreated: {
            blobObject: { blobId: 'rt-blob', id: 'rt-obj', size: 8, storedEpoch: 0 },
            encodedSize: 8,
            cost: 80,
          },
        }),
      )
      // 2nd call: download
      .mockResolvedValueOnce(makeResponse(original.buffer));

    const { blobId } = await uploadBlob(original);
    const downloaded = await downloadBlob(blobId);

    expect(downloaded).toEqual(original);
    expect(downloaded.byteLength).toBe(original.byteLength);
  });
});

// ─── getBlobUrl ────────────────────────────────────────────────────────────

describe('getBlobUrl', () => {
  it('includes blobId at the end of the URL', () => {
    const url = getBlobUrl('test-id-123');
    expect(url).toMatch(/test-id-123$/);
  });

  it('includes /v1/blobs/ path', () => {
    expect(getBlobUrl('x')).toContain('/v1/blobs/');
  });

  it('uses aggregator base URL', () => {
    const url = getBlobUrl('any');
    expect(url).toMatch(/walrus/);
  });
});
