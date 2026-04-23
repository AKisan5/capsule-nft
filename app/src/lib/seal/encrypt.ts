// Seal 暗号化スタブ — Phase 2 で実装
// Seal SDK (@mysten/seal) が stable になったら差し替える

export async function encryptData(_data: Uint8Array, _policyObjectId: string): Promise<Uint8Array> {
  // TODO: implement with @mysten/seal
  throw new Error('Seal encryption not yet implemented');
}

export async function decryptData(_encrypted: Uint8Array): Promise<Uint8Array> {
  // TODO: implement with @mysten/seal
  throw new Error('Seal decryption not yet implemented');
}
