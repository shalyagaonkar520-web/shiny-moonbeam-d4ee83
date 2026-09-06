import { create } from 'zustand';

interface InstallModalStore {
  isOpen: boolean;
  deferredPrompt: any;
  openModal: () => void;
  closeModal: () => void;
  setDeferredPrompt: (prompt: any) => void;
}

export const useInstallModalStore = create<InstallModalStore>((set) => ({
  isOpen: false,
  deferredPrompt: null,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
}));
