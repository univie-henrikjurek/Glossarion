import { useState, useMemo, useEffect } from 'react';
import type { Entry, Translation } from '../../types';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useAppStore } from '../../stores/appStore';
import { LANGUAGE_NAMES } from '../../utils/languageUtils';
import TableCell from './TableCell';

const HIDDEN_COLS_KEY = 'glossarion_hidden_columns';
const FILTERS_KEY = 'glossarion_filters';

type SortKey = 'date' | 'status' | string;
type SortDirection = 'asc' | 'desc';
type CompletenessFilter = 'all' | 'complete' | 'incomplete';

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

interface FilterState {
  completeness: CompletenessFilter;
  selectedTags: string[];
  maxAgeDays: number | null;
  wordTypes: string[];
}

const DEFAULT_FILTERS: FilterState = {
  completeness: 'all',
  selectedTags: [],
  maxAgeDays: null,
  wordTypes: [],
};

function TranslateIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={`w-5 h-5 ${className}`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  );
}

function GlowTranslateIcon({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={`translate-glow-ring absolute w-6 h-6 rounded-full ${active ? '' : 'opacity-0'}`} />
      <span className="relative">
        <TranslateIcon className={active ? 'text-purple-400 translate-glow-icon' : 'text-slate-600'} />
      </span>
    </span>
  );
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === 'asc') return <span className="ml-1 text-xs">↑</span>;
  if (direction === 'desc') return <span className="ml-1 text-xs">↓</span>;
  return <span className="ml-1 text-xs opacity-30">↕</span>;
}

interface DeleteConfirmState {
  entryId: string | null;
  entryText: string;
  hasVerified: boolean;
}

export default function DictionaryTable() {
  const { entries, sourceLanguage, targetLanguages, availableLanguages, deleteEntry, autoTranslate, toggleTargetLanguage } = useDictionaryStore();
  const { setShowEntryModal } = useAppStore();
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateAllProgress, setTranslateAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ entryId: null, entryText: '', hasVerified: false });
  
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(HIDDEN_COLS_KEY);
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FILTERS_KEY);
      if (saved) {
        try {
          return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_FILTERS;
        }
      }
    }
    return DEFAULT_FILTERS;
  });

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(Array.from(hiddenColumns)));
  }, [hiddenColumns]);

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    langs.add(sourceLanguage);
    availableLanguages.forEach(l => langs.add(l));
    entries.forEach((e: Entry) => {
      e.translations.forEach((t: Translation) => langs.add(t.language_code));
    });
    return Array.from(langs).sort();
  }, [entries, sourceLanguage, availableLanguages]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach(e => (e.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [entries]);

  const usedLanguages = useMemo(() => {
    const langs = new Set<string>();
    entries.forEach((e: Entry) => {
      e.translations.forEach((t: Translation) => langs.add(t.language_code));
    });
    return Array.from(langs).sort();
  }, [entries]);

  const visibleLanguages = useMemo(() => {
    return allLanguages.filter(lang => !hiddenColumns.has(`lang_${lang}`));
  }, [allLanguages, hiddenColumns]);

  const showDate = useMemo(() => !hiddenColumns.has('date'), [hiddenColumns]);

  const entriesNeedingTranslation = useMemo(() => {
    return entries.filter(entry => {
      const existingLangs = new Set(entry.translations.map(t => t.language_code));
      return targetLanguages.some(lang => !existingLangs.has(lang) && lang !== sourceLanguage);
    });
  }, [entries, targetLanguages, sourceLanguage]);

  const filteredAndSortedEntries = useMemo(() => {
    let result = [...entries];

    if (filters.completeness !== 'all') {
      result = result.filter(entry => {
        const hasAuto = entry.translations.some(t => t.status === 'auto');
        const hasUntranslated = targetLanguages.some(lang => 
          lang !== sourceLanguage && !entry.translations.some(t => t.language_code === lang)
        );
        if (filters.completeness === 'complete') {
          return !hasAuto && !hasUntranslated;
        }
        return hasAuto || hasUntranslated;
      });
    }

    if (filters.selectedTags.length > 0) {
      result = result.filter(entry =>
        filters.selectedTags.some(tag => (entry.tags || []).includes(tag))
      );
    }

    if (filters.maxAgeDays !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.maxAgeDays);
      result = result.filter(entry => new Date(entry.created_at) >= cutoff);
    }

    if (filters.wordTypes.length > 0) {
      result = result.filter(entry =>
        entry.translations.some(t => {
          const wt = t.word_type?.toLowerCase();
          return filters.wordTypes.some(ft => wt?.includes(ft));
        })
      );
    }

    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery.trim());
      const wildcardMatch = query.includes('*');
      result = result.filter(entry =>
        entry.translations.some(t => {
          const text = normalizeText(t.text || '');
          if (wildcardMatch) {
            const regex = new RegExp('^' + query.replace(/\*/g, '.*') + '$', 'i');
            return regex.test(text);
          }
          return text.includes(query);
        })
      );
    }

    result.sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortConfig.key === 'status') {
        const hasAutoA = a.translations.some(t => t.status === 'auto');
        const hasAutoB = b.translations.some(t => t.status === 'auto');
        return sortConfig.direction === 'asc' 
          ? (hasAutoA ? 1 : 0) - (hasAutoB ? 1 : 0)
          : (hasAutoB ? 1 : 0) - (hasAutoA ? 1 : 0);
      }
      const textA = a.translations.find(t => t.language_code === sortConfig.key)?.text?.toLowerCase() || '';
      const textB = b.translations.find(t => t.language_code === sortConfig.key)?.text?.toLowerCase() || '';
      return sortConfig.direction === 'asc' 
        ? textA.localeCompare(textB) 
        : textB.localeCompare(textA);
    });

    return result;
  }, [entries, filters, sortConfig, searchQuery, targetLanguages, sourceLanguage]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'desc') return { key, direction: 'asc' };
        return { key: 'date', direction: 'desc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const handleAutoTranslate = async (entryId: string) => {
    setTranslatingId(entryId);
    try {
      await autoTranslate(entryId);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleTranslateAll = async () => {
    if (entriesNeedingTranslation.length === 0) return;
    
    setTranslateAllProgress({ current: 0, total: entriesNeedingTranslation.length });
    
    for (let i = 0; i < entriesNeedingTranslation.length; i++) {
      setTranslateAllProgress({ current: i + 1, total: entriesNeedingTranslation.length });
      await autoTranslate(entriesNeedingTranslation[i].id);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setTranslateAllProgress(null);
  };

  const toggleColumn = (columnId: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const showAllColumns = () => setHiddenColumns(new Set());
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const handleDeleteClick = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    const verifiedTranslations = entry.translations.filter(t => t.status === 'verified');
    const hasVerified = verifiedTranslations.length > 0;
    
    let entryText = 'this entry';
    if (verifiedTranslations.length > 0) {
      entryText = `"${verifiedTranslations[0].text}"`;
      if (verifiedTranslations.length > 1) {
        entryText += ` und ${verifiedTranslations.length - 1} weitere`;
      }
    } else {
      const sourceTranslation = entry.translations.find(t => t.language_code === sourceLanguage);
      entryText = sourceTranslation?.text || 'this entry';
    }
    
    setDeleteConfirm({ entryId, entryText, hasVerified });
  };

  const confirmDelete = () => {
    if (deleteConfirm.entryId) {
      deleteEntry(deleteConfirm.entryId);
      setDeleteConfirm({ entryId: null, entryText: '', hasVerified: false });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ entryId: null, entryText: '', hasVerified: false });
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h2 className="text-xl font-medium text-slate-400 mb-2">No entries yet</h2>
        <p className="text-slate-500 mb-4">Add your first dictionary entry to get started</p>
        <button
          onClick={() => setShowEntryModal(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors"
        >
          + Add Entry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-300">Auto-translate:</span>
                <div className="flex items-center gap-2">
                  {targetLanguages.map((lang: string) => (
                    <button
                      key={lang}
                      onClick={() => toggleTargetLanguage(lang)}
                      className={`relative px-2.5 py-1 text-xs rounded-full transition-all duration-200 ${
                        targetLanguages.includes(lang)
                          ? 'bg-purple-600/80 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-500'
                          : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-400'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTranslateAll}
                disabled={entriesNeedingTranslation.length === 0 || translateAllProgress !== null}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-lg shadow-purple-500/30 transition-all duration-200 ${
                  entriesNeedingTranslation.length > 0
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Translate All ({entriesNeedingTranslation.length})
              </button>
              {translateAllProgress && (
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-700/50 rounded-lg">
                  <svg className="w-5 h-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span className="text-sm text-slate-300">
                    Translating {translateAllProgress.current}/{translateAllProgress.total}
                  </span>
                  <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${(translateAllProgress.current / translateAllProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 pt-3 border-t border-slate-700/30">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 pl-8 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">Show columns:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleColumn('date')}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    showDate
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                  }`}
                >
                  📅 Date
                </button>
                {allLanguages.map((lang: string) => (
                  <button
                    key={lang}
                    onClick={() => toggleColumn(`lang_${lang}`)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      !hiddenColumns.has(`lang_${lang}`)
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              {hiddenColumns.size > 0 && (
                <button
                  onClick={showAllColumns}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Show all
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-slate-500">Filters:</span>
              
              <select
                value={filters.completeness}
                onChange={(e) => setFilters(f => ({ ...f, completeness: e.target.value as CompletenessFilter }))}
                className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All items</option>
                <option value="complete">Only complete</option>
                <option value="incomplete">Missing translations</option>
              </select>

              {allTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Tags:</span>
                  <select
                    value={filters.selectedTags[0] || ''}
                    onChange={(e) => setFilters(f => ({ 
                      ...f, 
                      selectedTags: e.target.value ? [e.target.value] : [] 
                    }))}
                    className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">All tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Age:</span>
                <select
                  value={filters.maxAgeDays ?? ''}
                  onChange={(e) => setFilters(f => ({ 
                    ...f, 
                    maxAgeDays: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="">Any age</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Type:</span>
                {['noun', 'verb', 'adj'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilters(f => ({
                      ...f,
                      wordTypes: f.wordTypes.includes(type)
                        ? f.wordTypes.filter(t => t !== type)
                        : [...f.wordTypes, type]
                    }))}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      filters.wordTypes.includes(type)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {(filters.completeness !== 'all' || filters.selectedTags.length > 0 || filters.maxAgeDays !== null || filters.wordTypes.length > 0) && (
              <button
                onClick={resetFilters}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-2 px-2 text-xs text-slate-500">
        Showing {filteredAndSortedEntries.length} of {entries.length} entries
      </div>

      <div className="overflow-x-auto border border-slate-700 rounded-lg">
        <table 
          className="w-full"
          key={`table-${visibleLanguages.sort().join('-')}-${showDate}`}
        >
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-b border-slate-700 w-24">
                Actions
              </th>
              {visibleLanguages.map((lang: string) => {
                const isTargetLang = targetLanguages.includes(lang);
                const isSorted = sortConfig.key === lang;
                return (
                  <th 
                    key={lang} 
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-b border-l border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleTargetLanguage(lang);
                        }}
                        title={isTargetLang ? 'Click to disable auto-translate' : 'Click to enable auto-translate'}
                        className="p-0.5 rounded hover:bg-slate-700/50 transition-colors"
                      >
                        <GlowTranslateIcon active={isTargetLang} />
                      </button>
                      <button
                        onClick={() => handleSort(lang)}
                        className={`flex items-center gap-1 transition-colors cursor-pointer ${isSorted ? 'text-purple-400' : 'hover:text-primary-400'}`}
                        title="Sort by this language"
                      >
                        <span className="font-bold">{lang.toUpperCase()}</span>
                        <span className="text-xs text-slate-500">{LANGUAGE_NAMES[lang]?.slice(0, 3)}</span>
                        <SortIcon direction={isSorted ? sortConfig.direction : null} />
                      </button>
                    </div>
                  </th>
                );
              })}
              {showDate && (
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-b border-l border-slate-700 w-20 cursor-pointer hover:text-purple-400"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Date</span>
                    <SortIcon direction={sortConfig.key === 'date' ? sortConfig.direction : null} />
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredAndSortedEntries.map((entry: Entry) => (
              <tr key={entry.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-2 border-r border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAutoTranslate(entry.id)}
                      disabled={translatingId === entry.id}
                      className="p-1 text-slate-400 hover:text-primary-400 disabled:opacity-50"
                      title="Auto-translate"
                    >
                      {translatingId === entry.id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(entry.id)}
                      className="p-1 text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
                {visibleLanguages.map((lang: string) => {
                  const translation = entry.translations.find((t: Translation) => t.language_code === lang);
                  return (
                    <td key={lang} className="px-4 py-2 border-l border-slate-700 min-w-32">
                      <TableCell
                        entryId={entry.id}
                        translation={translation}
                        languageCode={lang}
                        isSource={lang === sourceLanguage}
                        searchQuery={searchQuery}
                      />
                    </td>
                  );
                })}
                {showDate && (
                  <td className="px-4 py-2 border-l border-slate-700 w-20">
                    {(() => {
                      const date = new Date(entry.created_at);
                      const today = new Date();
                      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                      let dateStr = '';
                      if (diffDays === 0) {
                        const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div className="text-xs text-slate-500">
                            <div>Today</div>
                            <div className="opacity-70">{time}</div>
                          </div>
                        );
                      }
                      else if (diffDays === 1) {
                        const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div className="text-xs text-slate-500">
                            <div>Yesterday</div>
                            <div className="opacity-70">{time}</div>
                          </div>
                        );
                      }
                      else if (diffDays < 7) dateStr = `${diffDays}d ago`;
                      else dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                      return <span className="text-xs text-slate-500">{dateStr}</span>;
                    })()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteConfirm.entryId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${deleteConfirm.hasVerified ? 'bg-amber-600/20' : 'bg-red-600/20'}`}>
                <svg className={`w-6 h-6 ${deleteConfirm.hasVerified ? 'text-amber-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Entry</h3>
            </div>
            
            {deleteConfirm.hasVerified ? (
              <div className="mb-6">
                <p className="text-slate-300 mb-2">
                  Are you sure you want to delete <span className="font-semibold text-white">"{deleteConfirm.entryText}"</span>?
                </p>
                <p className="text-amber-400 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  This entry contains verified translations that will be lost.
                </p>
              </div>
            ) : (
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete <span className="font-semibold text-white">"{deleteConfirm.entryText}"</span>?
              </p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                  deleteConfirm.hasVerified 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
