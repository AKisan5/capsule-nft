'use client';

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import {
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
  decodeJwt,
} from '@mysten/sui/zklogin';
import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient } from './client';

// SuiJsonRpcClient の executeTransactionBlock 戻り値型を引用
type SuiTransactionBlockResponse = Awaited<
  ReturnType<ReturnType<typeof getSuiClient>['executeTransactionBlock']>
>;

// ─── IndexedDB helpers ─────────────────────────────────────────────────────

const DB_NAME = 'capsule_zklogin';
const DB_VERSION = 1;
const STORE_EPHEMERAL = 'ephemeral';
const STORE_SALT = 'salt';

function openZkLoginDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_EPHEMERAL)) {
        db.createObjectStore(STORE_EPHEMERAL);
      }
      if (!db.objectStoreNames.contains(STORE_SALT)) {
        db.createObjectStore(STORE_SALT);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openZkLoginDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openZkLoginDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface EphemeralRecord {
  /** Ed25519 秘密鍵 (Bech32 エンコード: "suiprivkey1...") */
  secretKey: string;
  /** nonce 生成に使ったランダム性 */
  randomness: string;
  /** この ephemeral key が有効な最大 epoch */
  maxEpoch: number;
}

export interface ZkProof {
  proofPoints: { a: string[]; b: string[][]; c: string[] };
  issBase64Details: { value: string; indexMod4: number };
  headerBase64: string;
  addressSeed: string;
}

export interface ZkLoginSession {
  /** ユーザーのオンチェーンアドレス (zkLogin ベース) */
  address: string;
  /** Google から受け取った JWT */
  jwt: string;
  /** zkLogin アドレス計算に使う salt */
  salt: string;
  /** ZK 証明 */
  proof: ZkProof;
  /** 証明が有効な最大 epoch */
  maxEpoch: number;
  /** ephemeral 秘密鍵 (Bech32) - TX 署名に使う */
  ephemeralSecretKey: string;
}

// ─── OAuth URL 生成 ────────────────────────────────────────────────────────

const MAX_EPOCH_BUFFER = 10; // 現在 epoch + バッファ

/**
 * Google OAuth URL を生成する。
 * 内部で ephemeral keypair を作成し、IndexedDB に保存する。
 * リダイレクト先: /auth/callback (URL ハッシュに id_token が含まれる)
 */
export async function buildOAuthUrl(): Promise<string> {
  const keypair = Ed25519Keypair.generate();
  const { epoch } = await getSuiClient().getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + MAX_EPOCH_BUFFER;
  const randomness = generateRandomness();
  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

  const record: EphemeralRecord = {
    secretKey: keypair.getSecretKey(),
    randomness,
    maxEpoch,
  };
  await idbPut(STORE_EPHEMERAL, 'current', record);

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: 'id_token',
    scope: 'openid',
    nonce,
  });
  return `https://accounts.google.com/o/oauth2/auth?${params}`;
}

// ─── ZK Proof 取得 ─────────────────────────────────────────────────────────

/**
 * Mysten Labs の prover service から ZK 証明を取得する。
 * TODO: JWT を晒さないよう、本番では Route Handler 経由に移行する。
 */
async function fetchZkProof(
  jwt: string,
  extendedEphemeralPublicKey: string,
  maxEpoch: number,
  randomness: string,
  salt: string,
): Promise<ZkProof> {
  const proverUrl =
    process.env.NEXT_PUBLIC_ZKLOGIN_PROVER_URL ?? 'https://prover-dev.mystenlabs.com/v1';

  const res = await fetch(proverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch,
      jwtRandomness: randomness,
      salt,
      keyClaimName: 'sub',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ZK prover error ${res.status}: ${text}`);
  }

  return res.json() as Promise<ZkProof>;
}

// ─── OAuth コールバック処理 ─────────────────────────────────────────────────

/**
 * Google OAuth コールバックで受け取った JWT を処理し、ZkLoginSession を返す。
 * - IndexedDB から ephemeral key を復元
 * - salt を管理 (初回: 生成して保存 / 2回目以降: 既存を使用)
 * - ZK 証明を取得
 */
export async function processOAuthCallback(jwt: string): Promise<ZkLoginSession> {
  const record = await idbGet<EphemeralRecord>(STORE_EPHEMERAL, 'current');
  if (!record) {
    throw new Error('セッションが見つかりません。再度ログインしてください。');
  }

  const { secretKey, randomness, maxEpoch } = record;
  const { secretKey: secretKeyBytes } = decodeSuiPrivateKey(secretKey);
  const keypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);

  const { sub } = decodeJwt(jwt);

  // sub ごとに salt を固定して同一アドレスを保証する
  let salt = await idbGet<string>(STORE_SALT, sub);
  if (!salt) {
    salt = generateRandomness();
    await idbPut(STORE_SALT, sub, salt);
  }

  const address = jwtToAddress(jwt, salt, false);
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());
  const proof = await fetchZkProof(jwt, extendedEphemeralPublicKey, maxEpoch, randomness, salt);

  return { address, jwt, salt, proof, maxEpoch, ephemeralSecretKey: secretKey };
}

// ─── TX 署名・実行 ─────────────────────────────────────────────────────────

/**
 * zkLogin セッションで TX に署名して Sui ネットワークに送信する。
 * 1. TX bytes を build
 * 2. ephemeral key で signTransaction (intent prefix 付き)
 * 3. ZK 証明と合成して zkLogin 署名を生成
 * 4. executeTransactionBlock で実行
 */
export async function zkLoginSignAndExecute(
  tx: Transaction,
  session: ZkLoginSession,
): Promise<SuiTransactionBlockResponse> {
  const { proof, maxEpoch, ephemeralSecretKey, address } = session;
  const { secretKey: secretKeyBytes } = decodeSuiPrivateKey(ephemeralSecretKey);
  const keypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);
  const client = getSuiClient();

  tx.setSender(address);
  const txBytes = await tx.build({ client });

  // signTransaction は intent prefix (TransactionData) を自動付与してくれる
  const { signature: userSignature } = await keypair.signTransaction(txBytes);

  const zkSig = getZkLoginSignature({ inputs: proof, maxEpoch, userSignature });

  return client.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: zkSig,
    options: { showEffects: true, showObjectChanges: true },
  });
}
