import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table';
import type { Entry, Translation } from '../../types';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useAppStore } from '../../stores/appStore';
import { LANGUAGE_NAMES } from '../../utils/languageUtils';
import TableCell from './TableCell';

const columnHelper = createColumnHelper<Entry>();

export default function DictionaryTable() {
  const { entries, sourceLanguage, targetLanguages, availableLanguages, deleteEntry, autoTranslate, toggleTargetLanguage } = useDictionaryStore();
  const { setShowEntryModal } = useAppStore();
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hiddenLanguages, setHiddenLanguages] = useState<Set<string>>(new Set());

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
    return allLanguages.filter(lang => !hiddenLanguages.has(lang));
  }, [allLanguages, hiddenLanguages]);

  const handleAutoTranslate = async (entryId: string) => {
    setTranslatingId(entryId);
    try {
      await autoTranslate(entryId);
    } finally {
      setTranslatingId(null);
    }
  };

  const toggleLanguage = (lang: string) => {
    setHiddenLanguages(prev => {
      const next = new Set(prev);
      if (next.has(lang)) {
        next.delete(lang);
      } else {
        next.add(lang);
      }
      return next;
    });
  };

  const showAllLanguages = () => setHiddenLanguages(new Set());

  const columns = useMemo(() => {
    const cols = [
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 100,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAutoTranslate(row.original.id)}
              disabled={translatingId === row.original.id}
              className="p-1 text-slate-400 hover:text-primary-400 disabled:opacity-50"
              title="Auto-translate"
            >
              {translatingId === row.original.id ? (
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
              onClick={() => deleteEntry(row.original.id)}
              className="p-1 text-slate-400 hover:text-red-400"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ),
      }),
    ];

    visibleLanguages.forEach((lang: string) => {
      cols.push(
        columnHelper.accessor(
          (row) => {
            const t = row.translations.find((tr: Translation) => tr.language_code === lang);
            return t ? t.text : '';
          },
          {
            id: `lang_${lang}`,
            header: ({ table }) => {
              const sorted = table.getState().sorting.find(s => s.id === `lang_${lang}`);
              const isSorted = !!sorted;
              const isDesc = sorted?.desc;
              return (
                <div 
                  className="flex items-center gap-2 cursor-pointer select-none hover:text-primary-400 transition-colors" 
                  onClick={() => {
                    if (isSorted && !isDesc) {
                      setSorting([{ id: `lang_${lang}`, desc: true }]);
                    } else {
                      setSorting([{ id: `lang_${lang}`, desc: false }]);
                    }
                  }}
                >
                  <span className="font-bold">{lang.toUpperCase()}</span>
                  <span className="text-xs text-slate-500">{LANGUAGE_NAMES[lang]?.slice(0, 3)}</span>
                  {isSorted ? (
                    isDesc ? (
                      <span className="text-primary-400 font-bold" title="Sorted descending">▼</span>
                    ) : (
                      <span className="text-primary-400 font-bold" title="Sorted ascending">▲</span>
                    )
                  ) : (
                    <span className="opacity-20" title="Click to sort">↕</span>
                  )}
                </div>
              );
            },
            cell: ({ row }) => {
              const translation = row.original.translations.find((t: Translation) => t.language_code === lang);
              return (
                <TableCell
                  entryId={row.original.id}
                  translation={translation}
                  languageCode={lang}
                  isSource={lang === sourceLanguage}
                />
              );
            },
          }
        )
      );
    });

    return cols;
  }, [visibleLanguages, sourceLanguage, translatingId, deleteEntry]);

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
          <span className="text-sm text-slate-400">Auto-translate to:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableLanguages
            .map((lang: string) => (
              <button
                key={lang}
                onClick={() => toggleTargetLanguage(lang)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  targetLanguages.includes(lang)
                    ? 'bg-primary-600 text-white hover:bg-primary-500'
                    : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                }`}
                title={targetLanguages.includes(lang) ? 'Click to exclude from auto-translate' : 'Click to include in auto-translate'}
              >
                {lang.toUpperCase()} ({LANGUAGE_NAMES[lang]?.slice(0, 3)})
              </button>
            ))}
        </div>
      </div>

      <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Visible columns:</span>
          {hiddenLanguages.size > 0 && (
            <button
              onClick={showAllLanguages}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              Show all ({allLanguages.length})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allLanguages.map((lang: string) => (
            <button
              key={lang}
              onClick={() => toggleLanguage(lang)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                hiddenLanguages.has(lang)
                  ? 'bg-slate-700 text-slate-500 line-through'
                  : 'bg-primary-600 text-white hover:bg-primary-500'
              }`}
            >
              {lang.toUpperCase()} ({LANGUAGE_NAMES[lang]?.slice(0, 3)})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-700 rounded-lg">
        <table className="w-full">
          <thead className="bg-slate-800">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-b border-slate-700"
                    style={{ width: header.id === 'actions' ? 100 : undefined }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-700">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-800/50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 border-r border-slate-700 last:border-r-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
