import { NextRequest, NextResponse } from 'next/server';

const PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER ??
  'https://publisher.walrus-testnet.walrus.space';

// POST /api/walrus/upload?epochs=N
// Body: raw binary (image bytes)
// Proxies PUT to Walrus publisher — avoids browser CORS restriction.
export async function POST(req: NextRequest) {
  const epochs = req.nextUrl.searchParams.get('epochs') ?? '5';
  const body = await req.arrayBuffer();

  let res: Response;
  try {
    res = await fetch(`${PUBLISHER_URL}/v1/blobs?epochs=${epochs}`, {
      method: 'PUT',
      body,
    });
  } catch (cause) {
    console.error('[api/walrus/upload] publisher unreachable', cause);
    return NextResponse.json(
      { error: 'Walrus publisher に接続できません' },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `Walrus upload failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}` },
      { status: res.status },
    );
  }

  const json = await res.json();
  return NextResponse.json(json);
}
