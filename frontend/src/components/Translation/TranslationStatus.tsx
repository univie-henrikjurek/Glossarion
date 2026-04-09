interface TranslationStatusProps {
  status: string;
}

export default function TranslationStatus({ status }: TranslationStatusProps) {
  if (status === 'verified') {
    return (
      <span className="status-verified text-xs px-2 py-0.5 rounded-full flex items-center gap-1" title="Verified">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        OK
      </span>
    );
  }

  return (
    <span className="status-auto text-xs px-2 py-0.5 rounded-full" title="Auto-generated">
      AUTO
    </span>
  );
}
