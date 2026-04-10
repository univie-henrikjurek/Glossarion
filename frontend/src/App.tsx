import { useEffect } from 'react';
import { useDictionaryStore } from './stores/dictionaryStore';
import Header from './components/Layout/Header';
import DictionaryTable from './components/Table/DictionaryTable';
import EntryModal from './components/Entry/EntryModal';

const glowStyles = `
@keyframes translateBreath {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

@keyframes translateGlow {
  0%, 100% { 
    filter: drop-shadow(0 0 4px rgba(168, 85, 247, 0.5));
  }
  50% { 
    filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.9));
  }
}

.translate-glow-active {
  animation: translateBreath 2.5s ease-in-out infinite;
}

.translate-glow-ring {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%);
  animation: translateBreath 2.5s ease-in-out infinite;
}

.translate-glow-icon {
  animation: translateGlow 2.5s ease-in-out infinite;
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
      </div>
    </>
  );
}

export default App;
