import { useState, useRef, useEffect } from 'react';
import type { Translation } from '../../types';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import TranslationStatus from '../Translation/TranslationStatus';

interface TableCellProps {
  entryId: string;
  translation?: Translation;
  languageCode: string;
  isSource: boolean;
}

export default function TableCell({ entryId, translation, languageCode, isSource }: TableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(translation?.text || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const { addTranslation, updateTranslation } = useDictionaryStore();

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
      await updateTranslation(translation.id, { text: value.trim() });
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

  return (
    <div 
      className="editable-cell px-2 py-1 min-h-[2.5rem] flex items-center justify-between gap-2"
      onDoubleClick={() => setIsEditing(true)}
    >
      <span className="flex-1 text-sm">
        {value || <span className="text-slate-500 italic">Double-click to edit</span>}
      </span>
      {translation && (
        <button
          onClick={handleToggleStatus}
          className="shrink-0"
        >
          <TranslationStatus status={translation.status} />
        </button>
      )}
    </div>
  );
}
