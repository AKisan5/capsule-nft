import { NextRequest, NextResponse } from 'next/server';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

// Standalone server-side Sui client — avoids importing @mysten/dapp-kit (React context)
function getServerSuiClient(): SuiJsonRpcClient {
  const network =
    process.env.NEXT_PUBLIC_SUI_NETWORK === 'testnet' ? 'testnet' : 'devnet';
  const url =
    network === 'testnet'
      ? 'https://fullnode.testnet.sui.io:443'
      : 'https://fullnode.devnet.sui.io:443';
  return new SuiJsonRpcClient({ url, network });
}

// ─── Route Handler: POST /api/sponsor ────────────────────────────────────
//
// Body: { kindBytesBase64: string, senderAddress: string }
//
// Wraps a TransactionKind in a full sponsored transaction:
//   1. Reconstruct tx from kind bytes
//   2. Set sender, gas owner, gas payment, gas budget
//   3. Sign as sponsor (gas owner)
//   4. Return { txBytesBase64, sponsorSig }
//
// Required env vars:
//   SPONSOR_PRIVATE_KEY — Ed25519 secret key (Bech32: "suiprivkey1...")
//   SPONSOR_GAS_BUDGET  — (optional) override gas budget in MIST, default 20_000_000

export async function POST(req: NextRequest) {
  const sponsorKey = process.env.SPONSOR_PRIVATE_KEY;
  if (!sponsorKey) {
    return NextResponse.json(
      { error: 'Sponsor not configured for this deployment' },
      { status: 503 },
    );
  }

  let body: { kindBytesBase64: string; senderAddress: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { kindBytesBase64, senderAddress } = body;
  if (!kindBytesBase64 || !senderAddress) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const keypair = Ed25519Keypair.fromSecretKey(sponsorKey);
    const sponsorAddress = keypair.getPublicKey().toSuiAddress();
    const client = getServerSuiClient();

    // Fetch sponsor's gas coins (take the largest one)
    const { data: coins } = await client.getCoins({
      owner: sponsorAddress,
      limit: 5,
    });
    if (!coins.length) {
      return NextResponse.json({ error: 'Sponsor has no SUI balance' }, { status: 503 });
    }
    const gasCoin = coins.reduce((best, c) =>
      BigInt(c.balance) > BigInt(best.balance) ? c : best,
    );

    // Reconstruct transaction from kind bytes
    const kindBytes = fromBase64(kindBytesBase64);
    const tx = Transaction.fromKind(kindBytes);

    // Set gas configuration
    tx.setSender(senderAddress);
    tx.setGasOwner(sponsorAddress);
    tx.setGasPayment([
      {
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
        digest: gasCoin.digest,
      },
    ]);
    const gasBudget = process.env.SPONSOR_GAS_BUDGET
      ? Number(process.env.SPONSOR_GAS_BUDGET)
      : 20_000_000; // 0.02 SUI
    tx.setGasBudget(gasBudget);

    // Build full transaction bytes
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toBase64(txBytes);

    // Sponsor signs as gas owner
    const { signature: sponsorSig } = await keypair.signTransaction(txBytes);

    return NextResponse.json({ txBytesBase64, sponsorSig });
  } catch (err) {
    console.error('[api/sponsor]', err);
    return NextResponse.json({ error: 'Sponsor signing failed' }, { status: 500 });
  }
}
