import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDictionaryStore } from './stores/dictionaryStore';
import Header from './components/Layout/Header';
import DictionaryTable from './components/Table/DictionaryTable';
import EntryModal from './components/Entry/EntryModal';
import WordDetailsPanel from './components/WordDetails/WordDetailsPanel';

function AppContent() {
  const { fetchDictionaries, isLoading, error, clearError, currentDictionary, setTargetLanguages } = useDictionaryStore();

  useEffect(() => {
    // Always reset targetLanguages to defaults on mount
    setTargetLanguages(['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru']);
    fetchDictionaries();

    const handleOnline = () => useDictionaryStore.getState().setOnline(true);
    const handleOffline = () => useDictionaryStore.getState().setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : currentDictionary ? (
          <DictionaryTable />
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-slate-400 mb-4">No dictionary selected</p>
            <p className="text-slate-500 text-sm">Create a new dictionary or select one from the dropdown above.</p>
          </div>
        )}
      </main>
      
      <EntryModal />
      <WordDetailsPanel />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
