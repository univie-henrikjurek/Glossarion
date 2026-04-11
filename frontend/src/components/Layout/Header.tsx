import { useState } from 'react';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';

interface HeaderProps {
  onOpenShare?: () => void;
}

export default function Header({ onOpenShare }: HeaderProps) {
  const { 
    dictionaries, 
    currentDictionary, 
    selectDictionary, 
    entries, 
    isOnline, 
    lastSync,
    createDictionary
  } = useDictionaryStore();
  const { user, logout } = useAuthStore();
  const { setShowEntryModal, grammarMode, toggleGrammarMode } = useAppStore();
  const [showDictDropdown, setShowDictDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewDictInput, setShowNewDictInput] = useState(false);
  const [newDictName, setNewDictName] = useState('');

  const handleCreateDict = async () => {
    if (newDictName.trim()) {
      await createDictionary(newDictName.trim());
      setNewDictName('');
      setShowNewDictInput(false);
      setShowDictDropdown(false);
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary-400">Glossarion</h1>
          
          <div className="relative">
            <button
              onClick={() => setShowDictDropdown(!showDictDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium">
                {currentDictionary?.name || 'Select Dictionary'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDictDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50">
                <div className="max-h-64 overflow-y-auto">
                  {dictionaries.map(dict => (
                    <button
                      key={dict.id}
                      onClick={() => {
                        selectDictionary(dict);
                        setShowDictDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-600 transition-colors ${
                        currentDictionary?.id === dict.id ? 'bg-primary-600/30' : ''
                      }`}
                    >
                      <div className="text-sm font-medium">{dict.name}</div>
                      <div className="text-xs text-slate-400">
                        {dict.entry_count || 0} entries · {dict.role}
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="border-t border-slate-600 p-2">
                  {showNewDictInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDictName}
                        onChange={e => setNewDictName(e.target.value)}
                        placeholder="Dictionary name"
                        className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-sm"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleCreateDict()}
                      />
                      <button
                        onClick={handleCreateDict}
                        className="px-2 py-1 bg-primary-600 hover:bg-primary-500 rounded text-sm"
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewDictInput(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-400 hover:bg-slate-600 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Dictionary
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <span className="text-slate-400 text-sm">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {onOpenShare && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
          
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
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-xs font-medium">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm">{user?.username}</span>
            </button>
            
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
          
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
