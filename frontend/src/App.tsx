import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useDictionaryStore } from './stores/dictionaryStore';
import { useAuthStore } from './stores/authStore';
import Header from './components/Layout/Header';
import DictionaryTable from './components/Table/DictionaryTable';
import EntryModal from './components/Entry/EntryModal';
import WordDetailsPanel from './components/WordDetails/WordDetailsPanel';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import ShareModal from './components/Share/ShareModal';

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function InvitationPage() {
  const { token } = useParams();
  const { checkInvitation, acceptInvitation, declineInvitation, pendingInvitation, clearPendingInvitation } = useDictionaryStore();
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'info' | 'accepting' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    if (!token) return;
    const info = await checkInvitation(token);
    if (info) {
      setStatus('info');
    } else {
      setStatus('error');
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setStatus('accepting');
    const success = await acceptInvitation(token);
    if (success) {
      setStatus('success');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      setStatus('error');
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    await declineInvitation(token);
    clearPendingInvitation();
    window.location.href = '/';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Invalid Invitation</h1>
          <p className="text-slate-400">This invitation link is invalid or has expired.</p>
          <a href="/" className="mt-4 inline-block text-primary-400 hover:text-primary-300">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-400 mb-4">Welcome!</h1>
          <p className="text-slate-400">You have successfully joined the dictionary.</p>
          <p className="text-slate-400 mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">You've Been Invited!</h1>
          <p className="text-slate-400 mb-6">
            Join <span className="text-primary-400">{pendingInvitation?.dictionary_name}</span> as{' '}
            <span className="text-primary-400">{pendingInvitation?.role}</span>
          </p>
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-64 mx-auto px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors"
            >
              Login to Accept
            </a>
            <a
              href="/register"
              className="block w-64 mx-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">You've Been Invited!</h1>
        <p className="text-slate-400 mb-2">
          Join <span className="text-primary-400">{pendingInvitation?.dictionary_name}</span>
        </p>
        <p className="text-slate-500 mb-6">
          Invited by <span className="text-slate-400">{pendingInvitation?.invited_by}</span> as{' '}
          <span className="text-primary-400">{pendingInvitation?.role}</span>
        </p>
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={status === 'accepting'}
            className="w-64 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            {status === 'accepting' ? 'Accepting...' : 'Accept Invitation'}
          </button>
          <button
            onClick={handleDecline}
            className="w-64 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { fetchDictionaries, isLoading, error, clearError, currentDictionary } = useDictionaryStore();
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
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
    <>
      <style>{glowStyles}</style>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Header onOpenShare={() => setShowShareModal(true)} />
        
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
        <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitationPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
