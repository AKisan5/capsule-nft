'use client';

import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { buildMintTx, extractCapsuleObjectId, mintDemo, type MintInput } from '@/lib/sui/mint';
import { getSuiClient } from '@/lib/sui/client';

export function useMintCapsule() {
  const account = useCurrentAccount();
  const { mutateAsync } = useSignAndExecuteTransaction({
    execute: ({ bytes, signature }) =>
      getSuiClient().executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showObjectChanges: true },
      }),
  });

  async function mint(input: MintInput): Promise<string> {
    if (account) {
      const tx = buildMintTx(input);
      const result = await mutateAsync({ transaction: tx, chain: 'sui:devnet' });
      return extractCapsuleObjectId(result, account.address);
    }
    return mintDemo(input);
  }

  return { mint, connected: !!account };
}
