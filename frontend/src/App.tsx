import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDictionaryStore } from './stores/dictionaryStore';
import Header from './components/Layout/Header';
import DictionaryTable from './components/Table/DictionaryTable';
import EntryModal from './components/Entry/EntryModal';
import WordDetailsPanel from './components/WordDetails/WordDetailsPanel';
import ShareModal from './components/Share/ShareModal';

interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  route?: string;
}

const hotspots: Hotspot[] = [
  { id: 'dictionary', label: 'Dictionary', x: 70, y: 50, route: '/' },
  { id: 'settings', label: 'Settings', x: 30, y: 50, route: '/settings' },
];

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

function ParallaxBackground() {
  const [activeHotspot, setActiveHotspot] = useState<string>('dictionary');
  const [bgPosition, setBgPosition] = useState({ x: 70, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const hotspot = hotspots.find(h => h.id === activeHotspot);
    if (hotspot) {
      setIsZooming(true);
      setTimeout(() => setIsZooming(false), 1500);
      setBgPosition({ x: hotspot.x, y: hotspot.y });
    }
  }, [activeHotspot]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const bgLayer = document.getElementById('parallax-hero-bg');
      if (bgLayer) {
        bgLayer.style.transform = `translateY(${scrolled * 0.2}px) scale(1.1)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateTo = (hotspotId: string) => {
    setActiveHotspot(hotspotId);
  };

  return (
    <>
      <div className="fixed inset-0 overflow-hidden z-0">
        <div className="parallax-gradient" />
        
        <div 
          id="parallax-hero-bg"
          className="parallax-hero-bg"
          style={{ 
            backgroundImage: 'url(/images/hero-bg.svg)',
            backgroundPosition: `${bgPosition.x}% ${bgPosition.y}%`,
            backgroundSize: isZooming ? '120%' : '100%',
            transition: isZooming 
              ? 'background-position 1.5s cubic-bezier(0.4, 0, 0.2, 1), background-size 1.5s ease-out'
              : 'none'
          }}
        />
        
        <div className="parallax-overlay" />
      </div>

      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-4">
        {hotspots.map(hotspot => (
          <button
            key={hotspot.id}
            onClick={() => navigateTo(hotspot.id)}
            className={`px-4 py-2 rounded-full backdrop-blur-md transition-all duration-300 ${
              activeHotspot === hotspot.id 
                ? 'bg-purple-600/80 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            {hotspot.label}
          </button>
        ))}
      </div>

      <div 
        ref={containerRef}
        className="fixed top-8 left-1/2 transform -translate-x-1/2 z-20"
        style={{ 
          left: `${bgPosition.x}%`,
          transform: 'translateX(-50%)',
          transition: 'left 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 shadow-2xl border border-slate-700/50">
          <h1 className="text-2xl font-bold text-white">Glossarion</h1>
          <p className="text-slate-400 text-sm">Your multilingual dictionary</p>
        </div>
      </div>
    </>
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
      <ParallaxBackground />
      
      <div className="relative z-10 min-h-screen">
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
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
