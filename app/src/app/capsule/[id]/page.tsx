import { notFound } from 'next/navigation';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { CapsuleViewer } from './CapsuleViewer';

// ── Sui capsule data type ─────────────────────────────────────────────────

export interface CapsuleData {
  id: string;
  photoBlobId: string;
  step1Category: string;
  step1Items: string[];
  step1FreeText: string;
  step2Polarity: string;
  step2Subcategory: string;
  step2Connection: string;
  step3Memo: string;
  mintedAtMs: number;
  eventName: string;
  fighterTag: string;
  creator: string;
}

// ── Server-side Sui fetch (no dapp-kit) ────────────────────────────────────

function getServerClient(): SuiJsonRpcClient {
  const network =
    process.env.NEXT_PUBLIC_SUI_NETWORK === 'testnet' ? 'testnet' : 'devnet';
  const url =
    network === 'testnet'
      ? 'https://fullnode.testnet.sui.io:443'
      : 'https://fullnode.devnet.sui.io:443';
  return new SuiJsonRpcClient({ url, network });
}

async function fetchCapsule(objectId: string): Promise<CapsuleData | null> {
  try {
    const client = getServerClient();
    const res = await client.getObject({
      id: objectId,
      options: { showContent: true },
    });

    const content = res.data?.content;
    if (!content || content.dataType !== 'moveObject') return null;

    // Sui JSON-RPC returns Move struct fields as plain key-value pairs.
    // u64 → string, String → string, vector<String> → string[]
    const f = content.fields as Record<string, unknown>;

    return {
      id: res.data?.objectId ?? objectId,
      photoBlobId:     String(f.photo_blob_id ?? ''),
      step1Category:   String(f.step1_category ?? ''),
      step1Items:      Array.isArray(f.step1_items)
                         ? (f.step1_items as unknown[]).map(String)
                         : [],
      step1FreeText:   String(f.step1_free_text ?? ''),
      step2Polarity:   String(f.step2_polarity ?? ''),
      step2Subcategory:String(f.step2_subcategory ?? ''),
      step2Connection: String(f.step2_connection ?? ''),
      step3Memo:       String(f.step3_memo ?? ''),
      mintedAtMs:      Number(f.minted_at_ms ?? 0),
      eventName:       String(f.event_name ?? ''),
      fighterTag:      String(f.fighter_tag ?? ''),
      creator:         String(f.creator ?? ''),
    };
  } catch {
    return null;
  }
}

// ── Page (Server Component) ───────────────────────────────────────────────

export default async function CapsulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ minted?: string }>;
}) {
  const [{ id }, { minted }] = await Promise.all([params, searchParams]);
  const capsule = await fetchCapsule(id);
  if (!capsule) notFound();

  return <CapsuleViewer capsule={capsule} justMinted={minted === '1'} />;
}
