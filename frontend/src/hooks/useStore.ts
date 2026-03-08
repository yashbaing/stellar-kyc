import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  stellarAccount: string | null;
  publicKey: string | null;
  isConnected: boolean;
}

interface KYCState {
  status: string | null;
  riskLevel: string | null;
  credentialId: string | null;
  credentialHash: string | null;
  verifiedAt: number | null;
  expiresAt: number | null;
}

interface AppState {
  wallet: WalletState;
  kyc: KYCState;
  apiKey: string | null;

  connectWallet: (account: string, publicKey: string) => void;
  disconnectWallet: () => void;
  setKYCStatus: (kyc: Partial<KYCState>) => void;
  setApiKey: (key: string) => void;
  clearAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      wallet: { stellarAccount: null, publicKey: null, isConnected: false },
      kyc: {
        status: null,
        riskLevel: null,
        credentialId: null,
        credentialHash: null,
        verifiedAt: null,
        expiresAt: null,
      },
      apiKey: null,

      connectWallet: (account, publicKey) =>
        set({ wallet: { stellarAccount: account, publicKey, isConnected: true } }),

      disconnectWallet: () =>
        set({ wallet: { stellarAccount: null, publicKey: null, isConnected: false } }),

      setKYCStatus: (kyc) =>
        set((state) => ({ kyc: { ...state.kyc, ...kyc } })),

      setApiKey: (key) => set({ apiKey: key }),

      clearAll: () =>
        set({
          wallet: { stellarAccount: null, publicKey: null, isConnected: false },
          kyc: {
            status: null, riskLevel: null, credentialId: null,
            credentialHash: null, verifiedAt: null, expiresAt: null,
          },
          apiKey: null,
        }),
    }),
    { name: 'stellar-kyc-store' }
  )
);
