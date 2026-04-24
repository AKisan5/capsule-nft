'use client';

import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc';
import { CAPSULE_PACKAGE_ID, getSuiClient } from './client';

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

// ─── Transaction builder ──────────────────────────────────────────────────

function buildMintCommands(tx: Transaction, input: MintInput): void {
  tx.moveCall({
    target: `${CAPSULE_PACKAGE_ID}::capsule::mint`,
    arguments: [
      tx.pure.string(input.photoBlobId),
      tx.pure.string(input.step1.category),
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

export function extractCapsuleObjectId(result: SuiTransactionBlockResponse, ownerAddress: string): string {
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

// ─── Wallet path ──────────────────────────────────────────────────────────

export function buildMintTx(input: MintInput): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(100_000_000);
  buildMintCommands(tx, input);
  return tx;
}

// ─── Demo mode (no wallet) ────────────────────────────────────────────────

const DEMO_KEY_STORAGE = 'capsule_demo_privkey';
const FAUCET_URL =
  (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'devnet') === 'testnet'
    ? 'https://faucet.testnet.sui.io/gas'
    : 'https://faucet.devnet.sui.io/gas';

function getDemoKeypair(): Ed25519Keypair {
  if (typeof window === 'undefined') return new Ed25519Keypair();
  const stored = localStorage.getItem(DEMO_KEY_STORAGE);
  if (stored) {
    try {
      const { secretKey } = decodeSuiPrivateKey(stored);
      return Ed25519Keypair.fromSecretKey(secretKey);
    } catch { /* fall through */ }
  }
  const kp = new Ed25519Keypair();
  localStorage.setItem(DEMO_KEY_STORAGE, kp.getSecretKey());
  return kp;
}

async function ensureDemoGas(address: string): Promise<void> {
  const client = getSuiClient();
  const { totalBalance } = await client.getBalance({ owner: address });
  if (BigInt(totalBalance) >= BigInt(5_000_000)) return;
  try {
    await fetch(FAUCET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
    });
    await new Promise(r => setTimeout(r, 3000));
  } catch {
    throw new Error('フォーセットからSUIを取得できませんでした。しばらく待ってから再試行してください。');
  }
}

export async function mintDemo(input: MintInput): Promise<string> {
  const client = getSuiClient();
  const keypair = getDemoKeypair();
  const address = keypair.getPublicKey().toSuiAddress();

  await ensureDemoGas(address);

  const tx = new Transaction();
  tx.setSender(address);
  tx.setGasBudget(100_000_000);
  buildMintCommands(tx, input);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  return extractCapsuleObjectId(result, address);
}
