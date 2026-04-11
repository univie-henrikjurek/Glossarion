interface TranslationStatusProps {
  status: string;
  compact?: boolean;
}

export default function TranslationStatus({ status, compact = false }: TranslationStatusProps) {
  if (status === 'verified') {
    return (
      <span className={`status-verified flex items-center justify-center ${compact ? 'w-5 h-5' : 'text-xs px-2 py-0.5 rounded-full'}`} title="Verified">
        <svg className={compact ? 'w-4 h-4 text-emerald-400' : 'w-3 h-3'} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        {!compact && 'OK'}
      </span>
    );
  }

  return (
    <span className={`status-auto flex items-center justify-center ${compact ? 'w-5 h-5' : 'text-xs px-2 py-0.5 rounded-full'}`} title="Auto-generated">
      <svg className={compact ? 'w-3.5 h-3.5 text-slate-500' : 'w-3 h-3'} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
      {!compact && 'AUTO'}
    </span>
  );
}
