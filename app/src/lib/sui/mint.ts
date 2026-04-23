'use client';

import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { getZkLoginSignature } from '@mysten/sui/zklogin';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { CAPSULE_PACKAGE_ID, getSuiClient } from './client';
import { type ZkLoginSession, zkLoginSignAndExecute } from './zklogin';

// Sui shared clock object — always 0x6
const SUI_CLOCK_OBJECT_ID = '0x6';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MintInput {
  photoBlobId: string;
  step1: { category: string; items: string[]; freeText: string };
  step2: { polarity: string; subcategory: string; connection: string };
  step3: { memo: string };
  eventName: string;
  fighterTag: string;
}

type ExecuteResult = Awaited<
  ReturnType<ReturnType<typeof getSuiClient>['executeTransactionBlock']>
>;

// ─── Transaction builder ──────────────────────────────────────────────────

function buildMintCommands(tx: Transaction, input: MintInput): void {
  tx.moveCall({
    target: `${CAPSULE_PACKAGE_ID}::capsule::mint`,
    arguments: [
      tx.pure.string(input.photoBlobId),
      tx.pure.string(input.step1.category),
      // vector<String> — BCS: u32 length prefix then each string as u32-prefixed UTF-8 bytes
      tx.pure(bcs.vector(bcs.string()).serialize(input.step1.items).toBytes()),
      tx.pure.string(input.step1.freeText),
      tx.pure.string(input.step2.polarity),
      tx.pure.string(input.step2.subcategory),
      tx.pure.string(input.step2.connection),
      tx.pure.string(input.step3.memo),
      tx.pure.string(input.eventName),
      tx.pure.string(input.fighterTag),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
}

// ─── Object ID extraction ─────────────────────────────────────────────────

function extractCapsuleObjectId(result: ExecuteResult, ownerAddress: string): string {
  // Prefer objectChanges (richer info)
  const changes = result.objectChanges;
  if (changes) {
    for (const c of changes) {
      if (
        c.type === 'created' &&
        typeof c.owner === 'object' &&
        c.owner !== null &&
        'AddressOwner' in c.owner &&
        (c.owner as { AddressOwner: string }).AddressOwner === ownerAddress
      ) {
        return c.objectId;
      }
    }
  }

  // Fall back to effects.created
  const created = result.effects?.created;
  if (created) {
    for (const obj of created) {
      if (
        typeof obj.owner === 'object' &&
        obj.owner !== null &&
        'AddressOwner' in obj.owner &&
        (obj.owner as { AddressOwner: string }).AddressOwner === ownerAddress
      ) {
        return obj.reference.objectId;
      }
    }
  }

  throw new Error('Capsule object not found in transaction response');
}

// ─── Sponsored path ───────────────────────────────────────────────────────

async function mintSponsored(input: MintInput, session: ZkLoginSession): Promise<string> {
  const client = getSuiClient();

  // 1. Build only the transaction kind (commands + inputs, no gas data)
  const kindTx = new Transaction();
  kindTx.setSender(session.address);
  buildMintCommands(kindTx, input);
  const kindBytes = await kindTx.build({ client, onlyTransactionKind: true });

  // 2. Ask sponsor to wrap in a full tx, pay gas, and sign
  const res = await fetch('/api/sponsor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kindBytesBase64: toBase64(kindBytes),
      senderAddress: session.address,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Sponsor API ${res.status}`);
  }

  const { txBytesBase64, sponsorSig } = await res.json() as {
    txBytesBase64: string;
    sponsorSig: string;
  };

  // 3. User signs the sponsor-modified full tx bytes
  const { secretKey: secretKeyBytes } = decodeSuiPrivateKey(session.ephemeralSecretKey);
  const keypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);
  const txBytes = fromBase64(txBytesBase64);
  const { signature: ephemeralSig } = await keypair.signTransaction(txBytes);

  const zkSig = getZkLoginSignature({
    inputs: session.proof,
    maxEpoch: session.maxEpoch,
    userSignature: ephemeralSig,
  });

  // 4. Execute with both signatures (user + sponsor)
  const result = await client.executeTransactionBlock({
    transactionBlock: txBytesBase64,
    signature: [zkSig, sponsorSig],
    options: { showEffects: true, showObjectChanges: true },
  });

  return extractCapsuleObjectId(result, session.address);
}

// ─── Self-pay fallback ────────────────────────────────────────────────────

async function mintSelfPay(input: MintInput, session: ZkLoginSession): Promise<string> {
  const tx = new Transaction();
  buildMintCommands(tx, input);
  const result = await zkLoginSignAndExecute(tx, session);
  return extractCapsuleObjectId(result, session.address);
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Capsule NFT をミントする。
 * スポンサー API が利用可能なら手数料を運営負担。
 * 利用不可 (503 / ネットワーク障害) なら自己負担にフォールバック。
 *
 * @returns 作成された Capsule オブジェクト ID
 */
export async function mintCapsule(
  input: MintInput,
  session: ZkLoginSession,
): Promise<string> {
  try {
    return await mintSponsored(input, session);
  } catch (err) {
    console.warn('[mint] sponsor unavailable, falling back to self-pay:', err);
    return mintSelfPay(input, session);
  }
}
