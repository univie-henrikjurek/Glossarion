import { create } from 'zustand';

interface AppState {
  showEntryModal: boolean;
  setShowEntryModal: (show: boolean) => void;
  grammarMode: boolean;
  toggleGrammarMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  showEntryModal: false,
  setShowEntryModal: (show) => set({ showEntryModal: show }),
  grammarMode: false,
  toggleGrammarMode: () => set((state) => ({ grammarMode: !state.grammarMode })),
}));
