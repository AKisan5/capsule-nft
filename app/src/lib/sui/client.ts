import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { createNetworkConfig } from '@mysten/dapp-kit';

type AppNetwork = 'devnet' | 'testnet';

function resolveNetwork(env: string | undefined): AppNetwork {
  if (env === 'testnet') return 'testnet';
  return 'devnet'; // mainnet は MVP 対象外
}

export const NETWORK: AppNetwork = resolveNetwork(process.env.NEXT_PUBLIC_SUI_NETWORK);

export const CAPSULE_PACKAGE_ID = process.env.NEXT_PUBLIC_CAPSULE_PACKAGE_ID ?? '';

export const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  devnet: {
    url: 'https://fullnode.devnet.sui.io:443',
    network: 'devnet' as const,
    variables: {
      packageId: CAPSULE_PACKAGE_ID,
    },
  },
  testnet: {
    url: 'https://fullnode.testnet.sui.io:443',
    network: 'testnet' as const,
    variables: {
      packageId: CAPSULE_PACKAGE_ID,
    },
  },
});

// Standalone singleton client (Server Components / Route Handlers 用)
let _client: SuiJsonRpcClient | null = null;

export function getSuiClient(): SuiJsonRpcClient {
  if (!_client) {
    _client = new SuiJsonRpcClient({
      url: networkConfig[NETWORK].url,
      network: NETWORK,
    });
  }
  return _client;
}
