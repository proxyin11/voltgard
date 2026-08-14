import { create } from 'zustand';

interface VaultStore {
  isAuthenticated: boolean;
  userEmail: string | null;
  vaultKey: string | null;
  setAuth: (email: string, vaultKey: string) => void;
  logout: () => void;
}

export const useVaultStore = create<VaultStore>((set) => ({
  isAuthenticated: false,
  userEmail: null,
  vaultKey: null,
  setAuth: (email: string, vaultKey: string) => set({ isAuthenticated: true, userEmail: email, vaultKey }),
  logout: () => set({ isAuthenticated: false, userEmail: null, vaultKey: null }),
}));
