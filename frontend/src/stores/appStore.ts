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
  showSignLanguageModal: boolean;
  signLanguageTranslation: Translation | null;
  openSignLanguageModal: (translation: Translation) => void;
  closeSignLanguageModal: () => void;
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
  showSignLanguageModal: false,
  signLanguageTranslation: null,
  openSignLanguageModal: (translation) => set({ 
    showSignLanguageModal: true, 
    signLanguageTranslation: translation 
  }),
  closeSignLanguageModal: () => set({ 
    showSignLanguageModal: false, 
    signLanguageTranslation: null 
  }),
}));
