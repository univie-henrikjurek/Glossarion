import { create } from 'zustand';
import type { Entry, Translation } from '../types';

interface WordDetailsState {
  entry: Entry | null;
  translation: Translation | null;
  language: string;
}

interface AppState {
  showEntryModal: boolean;
  setShowEntryModal: (show: boolean) => void;
  grammarMode: boolean;
  toggleGrammarMode: () => void;
  wordDetails: WordDetailsState | null;
  openWordDetails: (entry: Entry, translation: Translation | null, language: string) => void;
  closeWordDetails: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  showEntryModal: false,
  setShowEntryModal: (show) => set({ showEntryModal: show }),
  grammarMode: false,
  toggleGrammarMode: () => set((state) => ({ grammarMode: !state.grammarMode })),
  wordDetails: null,
  openWordDetails: (entry, translation, language) => set({ 
    wordDetails: { entry, translation, language } 
  }),
  closeWordDetails: () => set({ wordDetails: null }),
}));
