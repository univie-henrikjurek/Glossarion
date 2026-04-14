import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Entry } from '../types';
import { apiService, Dictionary } from '../services/api';
import { syncService } from '../services/syncService';

interface DictionaryState {
  dictionaries: Dictionary[];
  currentDictionary: Dictionary | null;
  entries: Entry[];
  languages: string[];
  sourceLanguage: string;
  targetLanguages: string[];
  availableLanguages: string[];
  isLoading: boolean;
  isOnline: boolean;
  lastSync: string | null;
  error: string | null;
  
  fetchDictionaries: () => Promise<void>;
  selectDictionary: (dictionary: Dictionary) => void;
  createDictionary: (name: string, sourceLanguage?: string) => Promise<Dictionary | null>;
  deleteDictionary: (id: string) => Promise<void>;
  
  fetchEntries: () => Promise<void>;
  addEntry: (context?: string, tags?: string[], sourceLanguage?: string) => Promise<Entry | null>;
  updateEntry: (id: string, data: { context?: string; tags?: string[] }) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addTranslation: (entryId: string, languageCode: string, text: string, status?: string) => Promise<void>;
  updateTranslation: (id: string, data: { text?: string; status?: string }) => Promise<void>;
  deleteTranslation: (id: string) => Promise<void>;
  autoTranslate: (entryId: string, targetLangs?: string[]) => Promise<void>;
  setTargetLanguages: (langs: string[]) => void;
  toggleTargetLanguage: (lang: string) => void;
  setOnline: (online: boolean) => void;
  syncWithServer: () => Promise<void>;
  clearError: () => void;
  initLanguages: () => Promise<void>;
}

const ALL_LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru'];

const DEFAULT_TARGET_LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru'];

export const useDictionaryStore = create<DictionaryState>()(
  persist(
    (set, get) => ({
      dictionaries: [],
      currentDictionary: null,
      entries: [],
      languages: [],
      sourceLanguage: 'en',
      targetLanguages: DEFAULT_TARGET_LANGUAGES,
      availableLanguages: ALL_LANGUAGES,
      isLoading: false,
      isOnline: navigator.onLine,
      lastSync: null,
      error: null,

  fetchDictionaries: async () => {
    set({ isLoading: true, error: null });
    try {
      const dictionaries = await apiService.dictionaries.list();
      const current = get().currentDictionary;
      const selectedDict = current 
        ? dictionaries.find(d => d.id === current.id) || dictionaries[0] || null
        : dictionaries[0] || null;
      set({ dictionaries, currentDictionary: selectedDict, isLoading: false });
      if (selectedDict) {
        get().fetchEntries();
      }
    } catch {
      set({ isLoading: false, error: 'Failed to load dictionaries' });
    }
  },

  selectDictionary: (dictionary: Dictionary) => {
    set({ currentDictionary: dictionary, entries: [] });
    get().fetchEntries();
  },

  createDictionary: async (name: string, sourceLanguage: string = 'de') => {
    try {
      const dictionary = await apiService.dictionaries.create(name, sourceLanguage);
      const dictionaries = [...get().dictionaries, dictionary];
      set({ dictionaries, currentDictionary: dictionary, entries: [] });
      get().fetchEntries();
      return dictionary;
    } catch {
      set({ error: 'Failed to create dictionary' });
      return null;
    }
  },

  deleteDictionary: async (id: string) => {
    try {
      await apiService.dictionaries.delete(id);
      const dictionaries = get().dictionaries.filter(d => d.id !== id);
      const current = get().currentDictionary;
      const newCurrent = current?.id === id 
        ? dictionaries[0] || null 
        : current;
      set({ dictionaries, currentDictionary: newCurrent });
      if (newCurrent) {
        get().fetchEntries();
      } else {
        set({ entries: [] });
      }
    } catch {
      set({ error: 'Failed to delete dictionary' });
    }
  },

  fetchEntries: async () => {
    const currentDict = get().currentDictionary;
    set({ isLoading: true, error: null });
    try {
      const entries = await apiService.getEntries(currentDict?.id);
      await syncService.saveEntriesLocally(entries);
      set({ entries, isLoading: false, lastSync: new Date().toISOString() });
    } catch {
      const localEntries = await syncService.getLocalEntries();
      set({ 
        entries: localEntries, 
        isLoading: false, 
        error: 'Using offline data' 
      });
    }
  },

  addEntry: async (context?: string, tags: string[] = [], sourceLanguage?: string) => {
    const currentDict = get().currentDictionary;
    try {
      const entry = await apiService.createEntry({ 
        context, 
        tags, 
        source_language: sourceLanguage,
        dictionary_id: currentDict?.id 
      });
      const entries = [...get().entries, entry];
      await syncService.updateLocalEntry(entry);
      set({ entries });
      return entry;
    } catch {
      await syncService.addToSyncQueue('create', { context, tags, source_language: sourceLanguage, dictionary_id: currentDict?.id });
      set({ error: 'Saved offline - will sync when online' });
      return null;
    }
  },

  updateEntry: async (id: string, data: { context?: string; tags?: string[] }) => {
    try {
      const updated = await apiService.updateEntry(id, data);
      const entries = get().entries.map(e => e.id === id ? updated : e);
      await syncService.updateLocalEntry(updated);
      set({ entries });
    } catch {
      await syncService.addToSyncQueue('update', { id, ...data });
      set({ error: 'Update saved offline - will sync when online' });
    }
  },

  deleteEntry: async (id: string) => {
    try {
      await apiService.deleteEntry(id);
      await syncService.deleteLocalEntry(id);
      set({ entries: get().entries.filter(e => e.id !== id) });
    } catch {
      await syncService.addToSyncQueue('delete', { id });
      set({ error: 'Deletion saved offline - will sync when online' });
    }
  },

  addTranslation: async (entryId: string, languageCode: string, text: string, translationStatus: string = 'auto') => {
    try {
      const translation = await apiService.addTranslation(entryId, languageCode, text, translationStatus);
      const entries = get().entries.map(e => {
        if (e.id === entryId) {
          return { ...e, translations: [...e.translations, translation] };
        }
        return e;
      });
      set({ entries });
    } catch {
      set({ error: 'Failed to add translation' });
    }
  },

  updateTranslation: async (id: string, data: { text?: string; status?: string; word_type?: string; gender?: string; article?: string }) => {
    try {
      const updated = await apiService.updateTranslation(id, data);
      const entries = get().entries.map(e => ({
        ...e,
        translations: e.translations.map(t => t.id === id ? updated : t),
      }));
      set({ entries });
    } catch {
      set({ error: 'Failed to update translation' });
    }
  },

  deleteTranslation: async (id: string) => {
    try {
      await apiService.deleteTranslation(id);
      const entries = get().entries.map(e => ({
        ...e,
        translations: e.translations.filter(t => t.id !== id),
      }));
      set({ entries });
    } catch {
      set({ error: 'Failed to delete translation' });
    }
  },

  autoTranslate: async (entryId: string, targetLangs?: string[]): Promise<void> => {
    try {
      const targets = targetLangs || get().targetLanguages;
      await apiService.autoTranslate(entryId, targets);
      const updated = await apiService.getEntry(entryId);
      const entries = get().entries.map(e => e.id === entryId ? updated : e);
      await syncService.updateLocalEntry(updated);
      set({ entries });
    } catch {
      set({ error: 'Translation service unavailable' });
    }
  },

  setTargetLanguages: (langs: string[]) => {
    const available = get().availableLanguages;
    const filtered = langs.filter(l => available.includes(l));
    set({ targetLanguages: filtered });
  },

  toggleTargetLanguage: (lang: string) => {
    const current = get().targetLanguages;
    const available = get().availableLanguages;
    
    if (!available.includes(lang)) return;
    
    if (current.includes(lang)) {
      if (current.length > 1) {
        set({ targetLanguages: current.filter(l => l !== lang) });
      }
    } else {
      set({ targetLanguages: [...current, lang] });
    }
  },

  setOnline: (online: boolean) => {
    set({ isOnline: online });
    if (online) {
      get().syncWithServer();
    }
  },

  syncWithServer: async () => {
    const queue = await syncService.getSyncQueue();
    if (queue.length === 0) return;
    
    for (const item of queue) {
      try {
        if (item.type === 'create') {
          await apiService.createEntry(item.data as { context?: string; tags: string[] });
        } else if (item.type === 'update') {
          const { id, ...data } = item.data as { id: string };
          await apiService.updateEntry(id, data);
        } else if (item.type === 'delete') {
          const { id } = item.data as { id: string };
          await apiService.deleteEntry(id);
        }
      } catch {
        console.error('Sync failed for item:', item);
      }
    }
    
    await syncService.clearSyncQueue();
    await get().fetchEntries();
  },

  clearError: () => set({ error: null }),

  initLanguages: async () => {
    try {
      const langData = await apiService.getLanguages();
      set({ 
        sourceLanguage: langData.source,
        targetLanguages: langData.targets,
        availableLanguages: langData.available.map((l: { code: string }) => l.code)
      });
    } catch (e) {
      console.error('Failed to init languages from API:', e);
      // If API fails, keep using whatever is in state (from persist or defaults)
    }
  },
}),
{
  name: 'glossarion-store',
  partialize: (state) => ({
    targetLanguages: state.targetLanguages,
  }),
}
));
