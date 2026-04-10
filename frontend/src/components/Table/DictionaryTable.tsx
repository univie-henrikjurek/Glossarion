import { useState, useMemo, useEffect } from 'react';
import type { Entry, Translation } from '../../types';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useAppStore } from '../../stores/appStore';
import { LANGUAGE_NAMES } from '../../utils/languageUtils';
import TableCell from './TableCell';

const STORAGE_KEY = 'glossarion_hidden_columns';

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
  if (active) {
    return (
      <span className="translate-glow-active relative inline-flex items-center justify-center">
        <span className="translate-glow-ring absolute w-6 h-6 rounded-full"></span>
        <span className="translate-glow-icon relative">
          <TranslateIcon className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
        </span>
      </span>
    );
  }
  return <TranslateIcon className="text-slate-600" />;
}

export default function DictionaryTable() {
  const { entries, sourceLanguage, targetLanguages, availableLanguages, deleteEntry, autoTranslate, toggleTargetLanguage } = useDictionaryStore();
  const { setShowEntryModal } = useAppStore();
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenColumns)));
  }, [hiddenColumns]);

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    langs.add(sourceLanguage);
    targetLanguages.forEach(l => langs.add(l));
    entries.forEach((e: Entry) => {
      e.translations.forEach((t: Translation) => langs.add(t.language_code));
    });
    return Array.from(langs);
  }, [entries, sourceLanguage, targetLanguages]);

  const visibleLanguages = useMemo(() => {
    return allLanguages.filter(lang => !hiddenColumns.has(`lang_${lang}`));
  }, [allLanguages, hiddenColumns]);

  const showDate = useMemo(() => !hiddenColumns.has('date'), [hiddenColumns]);

  const handleAutoTranslate = async (entryId: string) => {
    setTranslatingId(entryId);
    try {
      await autoTranslate(entryId);
    } finally {
      setTranslatingId(null);
    }
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
      <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Visible columns:</span>
          {hiddenColumns.size > 0 && (
            <button
              onClick={showAllColumns}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              Show all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleColumn('date')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              showDate
                ? 'bg-primary-600 text-white hover:bg-primary-500'
                : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
            }`}
          >
            📅 Date
          </button>
          {allLanguages.map((lang: string) => (
            <button
              key={lang}
              onClick={() => toggleColumn(`lang_${lang}`)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                !hiddenColumns.has(`lang_${lang}`)
                  ? 'bg-primary-600 text-white hover:bg-primary-500'
                  : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
              }`}
            >
              {lang.toUpperCase()} ({LANGUAGE_NAMES[lang]?.slice(0, 3)})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-700 rounded-lg">
        <table 
          className="w-full"
          key={`table-${Array.from(hiddenColumns).sort().join('-')}`}
        >
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-b border-slate-700 w-24">
                Actions
              </th>
              {visibleLanguages.map((lang: string) => {
                const isTargetLang = targetLanguages.includes(lang);
                return (
                  <th key={lang} className="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-b border-l border-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTargetLanguage(lang);
                        }}
                        title={isTargetLang ? 'Click to disable auto-translate' : 'Click to enable auto-translate'}
                        className="p-0.5 rounded hover:bg-slate-700/50 transition-colors"
                      >
                        <GlowTranslateIcon active={isTargetLang} />
                      </button>
                      <button
                        onClick={() => toggleColumn(`lang_${lang}`)}
                        className="hover:text-primary-400 transition-colors cursor-pointer"
                      >
                        <span className="font-bold">{lang.toUpperCase()}</span>
                        <span className="ml-1 text-xs text-slate-500">{LANGUAGE_NAMES[lang]?.slice(0, 3)}</span>
                      </button>
                    </div>
                  </th>
                );
              })}
              {showDate && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-b border-l border-slate-700 w-20">
                  <span className="text-xs text-slate-500">Date</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {entries.map((entry: Entry) => (
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
                      onClick={() => deleteEntry(entry.id)}
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
                      let dateStr: string;
                      if (diffDays === 0) dateStr = 'Today';
                      else if (diffDays === 1) dateStr = 'Yesterday';
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
    </div>
  );
}
