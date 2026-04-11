import { useState, useRef, useEffect } from 'react';
import type { Translation } from '../../types';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useAppStore } from '../../stores/appStore';
import TranslationStatus from '../Translation/TranslationStatus';

interface TableCellProps {
  entryId: string;
  translation?: Translation;
  languageCode: string;
  isSource: boolean;
  searchQuery?: string;
}

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

function formatGrammarInfo(translation: Translation): string {
  const parts: string[] = [];
  
  if (translation.article) {
    parts.push(translation.article);
  }
  
  if (translation.gender) {
    parts.push(translation.gender);
  }
  
  if (translation.word_type) {
    parts.push(translation.word_type);
  }
  
  if (translation.grammar_details?.spacy && !parts.includes(translation.grammar_details.spacy)) {
    parts.push(translation.grammar_details.spacy);
  }
  
  if (translation.grammar_details?.wiktionary && !parts.includes(translation.grammar_details.wikitionary)) {
    parts.push(translation.grammar_details.wikitionary);
  }
  
  return parts.join(', ');
}

export default function TableCell({ entryId, translation, languageCode, isSource, searchQuery }: TableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(translation?.text || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const { addTranslation, updateTranslation } = useDictionaryStore();
  const { grammarMode, openWordDetails } = useAppStore();

  useEffect(() => {
    setValue(translation?.text || '');
  }, [translation?.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value.trim() === (translation?.text || '')) {
      setIsEditing(false);
      return;
    }

    if (translation) {
      const newStatus = translation.status === 'auto' ? 'verified' : translation.status;
      await updateTranslation(translation.id, { text: value.trim(), status: newStatus });
    } else if (value.trim()) {
      await addTranslation(entryId, languageCode, value.trim(), isSource ? 'verified' : 'auto');
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(translation?.text || '');
      setIsEditing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (translation) {
      const newStatus = translation.status === 'verified' ? 'auto' : 'verified';
      await updateTranslation(translation.id, { status: newStatus });
    }
  };

  const handleDoubleClick = () => {
    const { entries } = useDictionaryStore.getState();
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      openWordDetails(entry, translation || null, languageCode);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 bg-slate-700 border border-primary-500 rounded text-sm focus:outline-none"
          placeholder="Enter text..."
        />
      </div>
    );
  }

  const displayText = value || '';
  const grammarSuffix = grammarMode && translation ? formatGrammarInfo(translation) : '';
  
  const isHighlighted = searchQuery && translation?.text && 
    normalizeText(translation.text).includes(normalizeText(searchQuery));

  return (
    <div 
      className={`editable-cell relative px-2 py-1 min-h-[3rem] ${isHighlighted ? 'search-highlight' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className="pr-8">
        <div className="text-sm">{displayText || <span className="text-slate-500 italic">Double-click to edit</span>}</div>
        {grammarSuffix && (
          <div className="text-xs text-slate-500 mt-0.5">{grammarSuffix}</div>
        )}
      </div>
      {translation && (
        <button
          onClick={handleToggleStatus}
          className="absolute top-1 right-1"
        >
          <TranslationStatus status={translation.status} compact />
        </button>
      )}
    </div>
  );
}
