import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useAppStore } from '../../stores/appStore';

export default function Header() {
  const { entries, isOnline, lastSync } = useDictionaryStore();
  const { setShowEntryModal, grammarMode, toggleGrammarMode } = useAppStore();

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary-400">Glossarion</h1>
          <span className="text-slate-400 text-sm">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleGrammarMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              grammarMode 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Show grammar information (article, gender, word type)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-sm font-medium">Grammar</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-slate-400">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {lastSync && (
            <span className="text-sm text-slate-500">
              Last sync: {new Date(lastSync).toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={() => setShowEntryModal(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors"
          >
            + Add Entry
          </button>
        </div>
      </div>
    </header>
  );
}
