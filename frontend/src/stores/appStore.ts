import { create } from 'zustand';

interface AppState {
  showEntryModal: boolean;
  setShowEntryModal: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  showEntryModal: false,
  setShowEntryModal: (show) => set({ showEntryModal: show }),
}));
