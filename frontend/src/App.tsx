import { useEffect } from 'react';
import { useDictionaryStore } from './stores/dictionaryStore';
import Header from './components/Layout/Header';
import DictionaryTable from './components/Table/DictionaryTable';
import EntryModal from './components/Entry/EntryModal';

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
  );
}

export default App;
