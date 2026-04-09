import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useAppStore } from '../../stores/appStore';

export default function Header() {
  const { entries, isOnline, lastSync } = useDictionaryStore();
  const { setShowEntryModal } = useAppStore();

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
