
import React, { useEffect, useRef, useState } from 'react';
import { Search, Languages, Type } from 'lucide-react';
import { SubtitleTrack, UILanguage } from '../types';
import { translations } from '../utils/translations';

interface SubtitleListProps {
  tracks: SubtitleTrack[];
  activeTrackIds: string[];
  currentTime: number;
  subtitleSize: number;
  onSizeChange: (size: number) => void;
  onSeek: (time: number) => void;
  uiLanguage: UILanguage;
}

const SubtitleList: React.FC<SubtitleListProps> = ({ tracks, activeTrackIds, currentTime, subtitleSize, onSizeChange, onSeek, uiLanguage }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const t = translations[uiLanguage];

  useEffect(() => {
    if (activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTime]);

  const displayedTracks = activeTrackIds
    .map(id => tracks.find(track => track.id === id))
    .filter(Boolean) as SubtitleTrack[];

  const primaryTrack = displayedTracks[0];
  const secondaryTracks = displayedTracks.slice(1);

  const filteredLines = primaryTrack?.lines.filter(l => 
    l.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const sizes = [
    { label: t.tiny, val: 1.0 },
    { label: t.small, val: 1.2  },
    { label: t.normal, val: 1.4 },
    { label: t.large, val: 1.6 },
    { label: t.huge, val: 1.8 }
  ];

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-inner">
      <div className="p-2 border-b border-slate-800 space-y-2 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchTranscript} 
              className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className="p-1.5 bg-slate-950/50 border border-slate-800/50 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
              title={t.adjustFontSize}
            >
              <Type className="w-4 h-4" />
            </button>
            
            {showSizeMenu && (
              <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-1 min-w-[100px] animate-in fade-in slide-in-from-top-1">
                {sizes.map(s => (
                  <button 
                    key={s.val} 
                    onClick={() => { onSizeChange(s.val); setShowSizeMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors ${subtitleSize === s.val ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
        {displayedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 p-4 text-center opacity-40">
            <Languages className="w-8 h-8 mb-1" />
            <p className="text-[11px] italic">{t.noTracksVisible}</p>
            <p className="text-[9px] mt-1 opacity-50">{t.selectInSettings}</p>
          </div>
        ) : (
          filteredLines.map((line) => {
            const isActive = currentTime >= line.startTime && currentTime <= line.endTime;
            const linkedLines = secondaryTracks.map(track => 
              track.lines.find(l => Math.abs(l.startTime - line.startTime) < 0.5)
            ).filter(Boolean);

            const primaryFontSize = 13 * subtitleSize;
            const secondaryFontSize = 11 * subtitleSize;

            return (
              <button
                key={line.id}
                ref={isActive ? activeRef : null}
                onClick={() => onSeek(line.startTime)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border group relative ${
                  isActive 
                  ? 'bg-blue-600/10 border-blue-500/20 shadow-sm' 
                  : 'hover:bg-slate-800/30 border-transparent'
                }`}
              >
                <div className="space-y-0.5">
                  <p 
                    className={`leading-tight transition-colors ${
                      isActive ? 'text-blue-200 font-medium' : 'text-slate-300 group-hover:text-slate-100'
                    }`}
                    style={{ fontSize: `${primaryFontSize}px` }}
                  >
                    {line.text}
                  </p>
                  {linkedLines.map((l, i) => (
                    <p 
                      key={i} 
                      className={`leading-tight opacity-70 ${
                        isActive ? 'text-blue-300/60' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                      style={{ fontSize: `${secondaryFontSize}px` }}
                    >
                      {l?.text}
                    </p>
                  ))}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SubtitleList;
