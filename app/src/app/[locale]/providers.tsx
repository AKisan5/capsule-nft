'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { NETWORK, networkConfig } from '@/lib/sui/client';

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient は SSR で state を共有しないよう useState で生成する
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={NETWORK}>
        {/* theme: null で dapp-kit CSS-in-JS を無効化し Tailwind に統一 */}
        <WalletProvider autoConnect theme={null}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
