import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import algosdk from 'algosdk';
import { SupportedWallet, WalletAccount, WalletId, WalletManager } from '@txnlab/use-wallet';

// Pera only for admin panel
export const PROVIDER_ID = {
  PERA: WalletId.PERA
} as const;

type ProviderId = (typeof PROVIDER_ID)[keyof typeof PROVIDER_ID];

type ProviderInit = {
  id: ProviderId;
  clientStatic?: unknown;
};

type InitializeConfig = {
  providers: ProviderInit[];
};

type LegacyAccount = WalletAccount & {
  providerId: string;
};

type LegacyProvider = {
  metadata: {
    id: string;
    name: string;
    icon: string;
  };
  isConnected: boolean;
  isActive: boolean;
  accounts: WalletAccount[];
  connect: () => Promise<WalletAccount[]>;
  disconnect: () => Promise<void>;
  setActiveAccount: (address: string) => void;
};

type WalletContextValue = {
  providers: LegacyProvider[];
  activeAccount: LegacyAccount | null;
  activeAddress: string | null;
  signTransactions: (txns: Uint8Array[]) => Promise<(Uint8Array | null)[]>;
  sendTransactions: (
    signedTxns: (Uint8Array | null)[],
    waitRoundsToConfirm?: number
  ) => Promise<{ id: string }>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function useInitializeProviders(config: InitializeConfig): InitializeConfig {
  return config;
}

/**
 * Wait for transaction confirmation using JSON endpoint (not msgpack).
 * Inlined here to avoid circular dependency with governance-client.
 */
async function waitForConfirmationJson(
  txId: string,
  baseUrl: string,
  maxRounds: number = 8
): Promise<void> {
  const statusRes = await fetch(`${baseUrl}/api/algod/v2/status`, {
    cache: 'no-store'
  });
  if (!statusRes.ok) {
    throw new Error(`Failed to fetch algod status: ${statusRes.status}`);
  }
  const statusData = await statusRes.json();
  let currentRound: number = statusData['last-round'];

  for (let attempt = 0; attempt < maxRounds; attempt++) {
    const pendingRes = await fetch(
      `${baseUrl}/api/algod/v2/transactions/pending/${txId}`,
      { cache: 'no-store' }
    );
    if (pendingRes.ok) {
      const pendingData = await pendingRes.json();
      if (pendingData['confirmed-round'] && pendingData['confirmed-round'] > 0) {
        return;
      }
      if (pendingData['pool-error'] && pendingData['pool-error'] !== '') {
        throw new Error(
          `Transaction rejected by pool: ${pendingData['pool-error']}`
        );
      }
    }

    await fetch(
      `${baseUrl}/api/algod/v2/status/wait-for-block-after/${currentRound}`,
      { cache: 'no-store' }
    );
    currentRound += 1;
  }

  throw new Error(
    `Transaction ${txId} not confirmed after ${maxRounds} rounds`
  );
}

export function WalletProvider({
  value,
  children
}: {
  value: InitializeConfig;
  children: ReactNode;
}) {
  const managerRef = useRef<WalletManager | null>(null);
  const [tick, setTick] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!managerRef.current) {
      const manager = new WalletManager({
        wallets: value.providers.map((provider) => provider.id) as SupportedWallet[]
      });
      managerRef.current = manager;
      setIsReady(true);
      void manager.resumeSessions().catch(() => {});
    }

    const manager = managerRef.current as WalletManager;
    return manager.subscribe(() => {
      setTick((current) => current + 1);
    });
  }, []);

  const contextValue = useMemo<WalletContextValue>(() => {
    const manager = managerRef.current;
    if (!manager || !isReady) {
      return {
        providers: [],
        activeAccount: null,
        activeAddress: null,
        signTransactions: async () => {
          throw new Error('Wallet manager not ready');
        },
        sendTransactions: async () => {
          throw new Error('Wallet manager not ready');
        }
      };
    }

    const providers: LegacyProvider[] = manager.wallets.map((wallet) => ({
      metadata: {
        id: wallet.id,
        name: wallet.name,
        icon: wallet.metadata.icon
      },
      isConnected: wallet.isConnected,
      isActive: wallet.isActive,
      accounts: wallet.accounts,
      connect: () => wallet.connect(),
      disconnect: () => wallet.disconnect(),
      setActiveAccount: (address: string) => wallet.setActiveAccount(address)
    }));

    const activeWallet = manager.activeWallet;
    const activeAccount = manager.activeAccount
      ? {
          ...manager.activeAccount,
          providerId: activeWallet?.id ?? ''
        }
      : null;

    return {
      providers,
      activeAccount,
      activeAddress: manager.activeAddress,
      signTransactions: async (txns: Uint8Array[]) => {
        if (!manager.activeWallet) {
          throw new Error('Wallet is not connected');
        }
        return manager.activeWallet.signTransactions(txns);
      },
      sendTransactions: async (
        signedTxns: (Uint8Array | null)[],
        waitRoundsToConfirm = 8
      ) => {
        const txnsToSend = signedTxns.filter(
          (txn): txn is Uint8Array => txn !== null
        );
        if (!txnsToSend.length) {
          throw new Error('No signed transactions to send');
        }

        const { txid } = await manager.algodClient.sendRawTransaction(txnsToSend).do();
        if (waitRoundsToConfirm > 0) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008';
          await waitForConfirmationJson(txid, baseUrl, waitRoundsToConfirm);
        }
        return { id: txid };
      }
    };
  }, [isReady, tick]);

  return (
    <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
