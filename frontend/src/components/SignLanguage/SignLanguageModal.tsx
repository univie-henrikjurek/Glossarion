import { useState, useEffect } from 'react';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import type { Translation } from '../../types';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface SignLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  translation: Translation | null;
}

export default function SignLanguageModal({ isOpen, onClose, translation }: SignLanguageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showManual, setShowManual] = useState(false);
  const { updateTranslation } = useDictionaryStore();

  useEffect(() => {
    if (translation?.sign_language_url) {
      const videoId = extractVideoId(translation.sign_language_url);
      if (videoId) {
        setVideos([{
          id: videoId,
          title: 'Selected video',
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          channel: ''
        }]);
      }
    } else {
      setVideos([]);
    }
    if (translation?.text) {
      setSearchQuery(`${translation.text} Gebärdensprache`);
    }
  }, [translation, isOpen]);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const searchYouTube = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' }
      );
      const html = await response.text();
      
      const videoIds: YouTubeVideo[] = [];
      const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const titleRegex = /"title":{"runs":\[{"text":"([^"]+)"}/g;
      const channelRegex = /"longBylineText":{"simpleText":"([^"]+)"}/g;
      
      let idMatch;
      const ids: string[] = [];
      while ((idMatch = idRegex.exec(html)) && ids.length < 6) {
        if (!ids.includes(idMatch[1])) {
          ids.push(idMatch[1]);
        }
      }
      
      let titleMatch;
      const titles: string[] = [];
      const titleHtml = html.replace(/\\u0026/g, '&');
      while ((titleMatch = titleRegex.exec(titleHtml)) && titles.length < 6) {
        titles.push(titleMatch[1]);
      }
      
      let channelMatch;
      const channels: string[] = [];
      while ((channelMatch = channelRegex.exec(titleHtml)) && channels.length < 6) {
        channels.push(channelMatch[1]);
      }
      
      for (let i = 0; i < Math.min(ids.length, 6); i++) {
        videoIds.push({
          id: ids[i],
          title: titles[i] || `Video ${i + 1}`,
          thumbnail: `https://img.youtube.com/vi/${ids[i]}/hqdefault.jpg`,
          channel: channels[i] || ''
        });
      }
      
      setVideos(videoIds);
    } catch (error) {
      console.error('YouTube search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVideo = async (video: YouTubeVideo) => {
    if (!translation) return;
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    await updateTranslation(translation.id, { sign_language_url: url });
    onClose();
  };

  const handleManualSubmit = async () => {
    if (!translation || !manualUrl.trim()) return;
    const videoId = extractVideoId(manualUrl.trim());
    if (!videoId) {
      alert('Invalid YouTube URL');
      return;
    }
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    await updateTranslation(translation.id, { sign_language_url: url });
    onClose();
  };

  const handleRemove = async () => {
    if (!translation) return;
    await updateTranslation(translation.id, { sign_language_url: '' });
    setVideos([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl border border-slate-600 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">
            Sign Language Video
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for sign language videos..."
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && searchYouTube()}
            />
            <button
              onClick={searchYouTube}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={() => setShowManual(!showManual)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors"
            >
              Manual
            </button>
          </div>
        </div>

        {showManual && (
          <div className="p-4 border-b border-slate-700 bg-slate-750">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="Paste YouTube URL..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualUrl.trim()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-600 rounded-lg font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {videos.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              {isLoading ? 'Searching...' : 'Search for sign language videos'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleSelectVideo(video)}
                  className="text-left hover:bg-slate-700/50 rounded-lg p-2 transition-colors"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full aspect-video object-cover rounded"
                  />
                  <div className="mt-2 text-sm font-medium line-clamp-2">{video.title}</div>
                  {video.channel && (
                    <div className="text-xs text-slate-400">{video.channel}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {translation?.sign_language_url && (
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleRemove}
              className="w-full py-2 bg-red-600/30 hover:bg-red-600/50 text-red-400 rounded-lg font-medium transition-colors"
            >
              Remove Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}