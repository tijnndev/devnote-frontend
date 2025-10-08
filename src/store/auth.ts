import { create } from 'zustand';

const STORAGE_KEY = 'devnote:apiKey';

const getInitialKey = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
};

type AuthState = {
  apiKey?: string;
  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: getInitialKey(),
  setApiKey: (apiKey: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, apiKey);
    }
    set({ apiKey });
  },
  clearApiKey: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({ apiKey: undefined });
  }
}));
