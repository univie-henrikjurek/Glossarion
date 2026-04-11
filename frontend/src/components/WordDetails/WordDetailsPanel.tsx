import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../../stores/appStore';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { LANGUAGE_NAMES } from '../../utils/languageUtils';

interface WiktionaryData {
  pronunciation?: string;
  examples?: string[];
  etymology?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export default function WordDetailsPanel() {
  const { wordDetails, closeWordDetails } = useAppStore();
  const { updateTranslation, updateEntry, entries } = useDictionaryStore();
  const [wiktionaryData, setWiktionaryData] = useState<WiktionaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [context, setContext] = useState('');

  useEffect(() => {
    if (wordDetails?.entry) {
      const entry = entries.find(e => e.id === wordDetails.entry!.id);
      if (entry) {
        setTags(entry.tags || []);
        setContext(entry.context || '');
      }
    }
  }, [wordDetails, entries]);

  useEffect(() => {
    if (wordDetails?.translation?.text) {
      fetchWiktionaryData(wordDetails.translation.text, wordDetails.language);
    }
  }, [wordDetails?.translation?.text, wordDetails?.language]);

  const fetchWiktionaryData = async (word: string, lang: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${lang}.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word.toLowerCase())}`
      );
      if (response.ok) {
        const html = await response.text();
        const data = parseWiktionaryHtml(html, lang);
        setWiktionaryData(data);
      }
    } catch (error) {
      console.error('Wiktionary fetch error:', error);
    }
    setLoading(false);
  };

  const parseWiktionaryHtml = (html: string, lang: string): WiktionaryData => {
    const data: WiktionaryData = {};
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const IPA_CHARS = /[ɛɔəʊɪæɑŋçθðʃʒŋʔʰˈˌːʊ̯ɚɝɜɤɨɯʉøɵœɶɐäöüßàáèéìíòóùúâêîôûãẽĩõũ]|[a-zA-Z][ˈˌː]|[a-zA-Z][̯̤̩̪]/;
    
    const isValidIPA = (text: string): boolean => {
      const clean = text.replace(/[\[\]\/]/g, '');
      if (clean.length < 2 || clean.length > 35) return false;
      return IPA_CHARS.test(clean);
    };
    
    const findIPAInSection = (sectionHtml: string): string | null => {
      const ipaMatches = sectionHtml.match(/[\/\[][^\]\[]+[\/\]]/g) || [];
      for (const match of ipaMatches) {
        const cleaned = match.replace(/[\[\]\/]/g, '');
        if (isValidIPA(cleaned)) {
          return cleaned;
        }
      }
      return null;
    };
    
    const findIPAInTable = (table: Element): string | null => {
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        for (const cell of cells) {
          const text = cell.textContent || '';
          if (IPA_CHARS.test(text) && (text.includes('/') || text.includes('['))) {
            const match = text.match(/[\/\[][^\]\[]+[\/\]]/);
            if (match) {
              const cleaned = match[0].replace(/[\[\]\/]/g, '');
              if (isValidIPA(cleaned)) {
                return cleaned;
              }
            }
          }
        }
      }
      return null;
    };
    
    const headers = doc.querySelectorAll('h2, h3, h4, h5');
    for (const header of headers) {
      const text = header.textContent?.toLowerCase() || '';
      if (text.includes('pron') || text.includes('aussprache') || text.includes('pronuncia') || text.includes('prononciation')) {
        let sibling = header.nextElementSibling;
        let sectionHtml = '';
        while (sibling && !['H2', 'H3', 'H4', 'H5'].includes(sibling.tagName)) {
          sectionHtml += ' ' + sibling.innerHTML;
          sibling = sibling.nextElementSibling;
        }
        
        let ipa = findIPAInSection(sectionHtml);
        if (!ipa) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = sectionHtml;
          const tables = tempDiv.querySelectorAll('table');
          for (const table of tables) {
            ipa = findIPAInTable(table);
            if (ipa) break;
          }
        }
        
        if (ipa) {
          data.pronunciation = ipa;
          break;
        }
      }
      if (data.pronunciation) break;
    }
    
    const ddElements = doc.querySelectorAll('dd');
    const examples: string[] = [];
    for (const dd of ddElements) {
      const text = dd.textContent?.trim() || '';
      
      const isTranslationTable = /^[a-zA-Z]+:\s*[a-zA-Z]+(\s+[a-zA-Z]+:\s*[a-zA-Z]+)+$/;
      const isValidExample = text.length > 25 && text.length < 300 &&
        !isTranslationTable.test(text) &&
        !text.includes('Synonym') && !text.includes('Traduktion') &&
        !text.includes('Traduzione') && !text.includes('Traduction') &&
        !text.includes('Hinweis') && !text.includes('Siehe auch') &&
        !text.includes('Wiktionary') && !text.includes('Wikipedia') &&
        !text.includes(' IPA:') && !text.includes('Hörbeispiele') &&
        !text.includes('siehe auch') && !text.includes('Siehe auch');
      
      if (isValidExample) {
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const wordCount = cleaned.split(/\s+/).filter(w => w.length > 0).length;
        if (!examples.includes(cleaned) && wordCount >= 4) {
          examples.push(cleaned);
        }
      }
      if (examples.length >= 3) break;
    }
    data.examples = examples.length > 0 ? examples : undefined;

    return data;
  };

  const handleStatusChange = async (status: 'auto' | 'verified') => {
    if (wordDetails?.translation) {
      await updateTranslation(wordDetails.translation.id, { status });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && wordDetails?.entry) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      updateEntry(wordDetails.entry.id, { tags: updatedTags });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (wordDetails?.entry) {
      const updatedTags = tags.filter(t => t !== tag);
      setTags(updatedTags);
      updateEntry(wordDetails.entry.id, { tags: updatedTags });
    }
  };

  const handleContextSave = () => {
    if (wordDetails?.entry) {
      updateEntry(wordDetails.entry.id, { context });
    }
  };

  if (!wordDetails) return null;

  const { entry, translation, language } = wordDetails;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={closeWordDetails}
      />
      
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto">
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur border-b border-slate-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {language.toUpperCase()} - {LANGUAGE_NAMES[language] || language}
            </h2>
            {translation && (
              <p className="text-sm text-slate-400 mt-1">{translation.text}</p>
            )}
          </div>
          <button
            onClick={closeWordDetails}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {translation && (
            <>
              <section>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Translation
                </h3>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <ReactMarkdown className="text-white prose prose-sm prose-invert max-w-none">
                    {translation.text}
                  </ReactMarkdown>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Status
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange('verified')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      translation.status === 'verified'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    ✓ Verified
                  </button>
                  <button
                    onClick={() => handleStatusChange('auto')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      translation.status === 'auto'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    ⚡ Auto
                  </button>
                </div>
              </section>

              {translation.word_type || translation.gender || translation.article ? (
                <section>
                  <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Grammar
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {translation.article && (
                      <span className="px-3 py-1.5 bg-slate-700 rounded-lg text-slate-300 text-sm font-mono">
                        {translation.article}
                      </span>
                    )}
                    {translation.gender && (
                      <span className="px-3 py-1.5 bg-slate-700 rounded-lg text-slate-300 text-sm font-mono">
                        {translation.gender === 'm' ? 'masculine' : translation.gender === 'f' ? 'feminine' : 'neuter'}
                      </span>
                    )}
                    {translation.word_type && (
                      <span className="px-3 py-1.5 bg-slate-700 rounded-lg text-slate-300 text-sm">
                        {translation.word_type}
                      </span>
                    )}
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  Pronunciation
                </h3>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  {loading ? (
                    <span className="text-slate-500 animate-pulse">Loading...</span>
                  ) : wiktionaryData?.pronunciation ? (
                    <span className="text-purple-300 font-mono text-lg">
                      {wiktionaryData.pronunciation}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Not available</span>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Examples
                </h3>
                <div className="space-y-2">
                  {loading ? (
                    <span className="text-slate-500 animate-pulse">Loading examples...</span>
                  ) : wiktionaryData?.examples && wiktionaryData.examples.length > 0 ? (
                    wiktionaryData.examples.map((example, i) => (
                      <div key={i} className="bg-slate-700/50 rounded-lg p-3">
                        <ReactMarkdown className="text-slate-300 prose prose-sm prose-invert max-w-none">
                          {example}
                        </ReactMarkdown>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No examples available</span>
                  )}
                </div>
              </section>
            </>
          )}

          <section>
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tags
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-purple-600/30 text-purple-300 rounded-lg text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Context / Notes
            </h3>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onBlur={handleContextSave}
              placeholder="Add notes about this word..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </section>
        </div>
      </div>
    </>
  );
}
