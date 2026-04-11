import { useEffect } from 'react';
import { useDictionaryStore } from './stores/dictionaryStore';
import Header from './components/Layout/Header';
import DictionaryTable from './components/Table/DictionaryTable';
import EntryModal from './components/Entry/EntryModal';
import WordDetailsPanel from './components/WordDetails/WordDetailsPanel';

const glowStyles = `
.translate-glow-ring {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
}

.translate-glow-icon {
  filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.8));
}

.search-highlight {
  background: radial-gradient(ellipse at center, 
    transparent 0%, 
    transparent 45%, 
    rgba(168, 85, 247, 0.15) 55%, 
    rgba(168, 85, 247, 0.3) 70%, 
    rgba(168, 85, 247, 0.5) 85%, 
    rgba(168, 85, 247, 0.7) 100%
  );
  border-radius: 4px;
}
`;

function App() {
  const { fetchEntries, isLoading, error, clearError } = useDictionaryStore();

  useEffect(() => {
    fetchEntries();

    const handleOnline = () => useDictionaryStore.getState().setOnline(true);
    const handleOffline = () => useDictionaryStore.getState().setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchEntries]);

  return (
    <>
      <style>{glowStyles}</style>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Header />
        
        {error && (
          <div className="mx-4 mt-4 p-4 bg-amber-900/50 border border-amber-600 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-amber-300 hover:text-amber-100">
              Dismiss
            </button>
          </div>
        )}
        
        <main className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <DictionaryTable />
          )}
        </main>
        
        <EntryModal />
        <WordDetailsPanel />
      </div>
    </>
  );
}

export default App;
