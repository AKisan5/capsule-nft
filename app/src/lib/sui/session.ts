'use client';

import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';

export interface Session {
  address: string;
  signAndExecute: ReturnType<typeof useSignAndExecuteTransaction>['mutateAsync'];
}

export function useCurrentSession(): Session | null {
  const account = useCurrentAccount();
  const { mutateAsync } = useSignAndExecuteTransaction();
  if (!account) return null;
  return { address: account.address, signAndExecute: mutateAsync };
}
