import React, { useRef, useEffect, useState } from 'react';
import { SubtitleTrack, UILanguage } from '../types';
import { Captions, X, Check, Type } from 'lucide-react';
import { translations } from '../utils/translations';

interface VideoPlayerProps {
  url: string;
  title: string;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
  currentTime: number;
  tracks: SubtitleTrack[];
  activeTrackIds: string[];
  onTrackChange: (ids: string[]) => void;
  playbackRate: number;
  subtitleSize: number;
  onSpeedChange: (rate: number) => void;
  onSizeChange: (size: number) => void;
  onClose: () => void;
  uiLanguage: UILanguage;
  secondaryOpacity: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  url, 
  title,
  onTimeUpdate, 
  onDurationChange, 
  onEnded,
  currentTime,
  tracks,
  activeTrackIds,
  onTrackChange,
  playbackRate,
  subtitleSize,
  onSpeedChange,
  onSizeChange,
  onClose,
  uiLanguage,
  secondaryOpacity
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showTrackMenu, setShowTrackMenu] = useState(false);

  const t = translations[uiLanguage];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
  
    video.load();
  
    const handleCanPlay = async () => {

      video.playbackRate = playbackRate;
      
      if (currentTime > 0 && Math.abs(video.currentTime - currentTime) > 0.5) {
        video.currentTime = currentTime;
      }
  
      try {
        await video.play();
        console.log("switching video successful!");
      } catch (err) {
        console.warn("player: autoplay fails", err);
        // If it's being blocked, it's usually because there's no user interaction, and muting the sound can often solve the problem.
        // video.muted = true; 
        // video.play();
      }
    };
  
    video.addEventListener('canplay', handleCanPlay, { once: true });
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [url]); // reload once url change

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const displayedTracks = activeTrackIds
    .map(id => tracks.find(t => t.id === id))
    .filter(Boolean) as SubtitleTrack[];

  const activeLines = displayedTracks.map(track => 
    track.lines.find(line => currentTime >= line.startTime && currentTime <= line.endTime)
  );

  const toggleTrack = (id: string) => {
    const isSelected = activeTrackIds.includes(id);
    let newIds: string[];
    
    if (isSelected) {
      newIds = activeTrackIds.filter(i => i !== id);
    } else {
      newIds = [...activeTrackIds, id];
      if (newIds.length > 2) {
        newIds = newIds.slice(-2);
      }
    }
    console.log("手动切换字幕 ID 结果:", newIds);
    onTrackChange(newIds);
  };
  const speeds = [0.5, 1, 1.25, 1.5, 2, 2.5, 3];
  const sizes = [
    { label: t.tiny, val: 0.6 },
    { label: t.small, val: 0.8 },
    { label: t.normal, val: 1.0 },
    { label: t.large, val: 1.25 },
    { label: t.huge, val: 1.5 }
  ];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  return (
    <div 
      className="relative w-full h-full flex flex-col bg-black group/player overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowSpeedMenu(false); setShowSizeMenu(false); setShowTrackMenu(false); }}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain outline-none cursor-pointer"
        controls
        crossOrigin="anonymous"
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
        onEnded={onEnded}
      />
      
      <div className={`absolute top-0 left-0 right-0 px-1 overflow-hidden bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 pointer-events-none flex justify-between items-center z-50 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <h2 className="text-base font-semibold text-white/90 truncate drop-shadow-md">{title}</h2>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-lg pointer-events-auto transition-colors">
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      <div className={`absolute bottom-[5%] left-[22%] flex items-center justify-end gap-3 transition-opacity duration-300 z-50 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        {/* Size Menu */}
        <div className="relative">
          <button 
            title={t.adjustFontSize}
            onClick={() => { setShowSizeMenu(!showSizeMenu); setShowSpeedMenu(false); setShowTrackMenu(false); }} 
            className="flex items-center gap-2 bg-black/80 backdrop-blur-xl px-3 py-2 rounded-xl border border-white/10 text-white/90 hover:bg-slate-900 transition-all shadow-xl"
          >
            <Type className="w-5 h-5 text-blue-400" />
          </button>
          {showSizeMenu && (
            <div className="absolute bottom-full mb-3 right-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[120px] py-2 animate-in fade-in slide-in-from-bottom-2">
              {sizes.map(s => (
                <button key={s.val} onClick={() => { onSizeChange(s.val); setShowSizeMenu(false); }} className={`w-full text-left px-5 py-2.5 text-sm font-bold transition-colors ${subtitleSize === s.val ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Speed Menu */}
        <div className="relative">
          <button 
            title={t.playbackSpeed}
            onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSizeMenu(false); setShowTrackMenu(false); }} 
            className="flex items-center gap-2 bg-black/80 backdrop-blur-xl px-3 py-2 rounded-xl border border-white/10 text-white/90 hover:bg-slate-900 transition-all shadow-xl"
          >
            <span className="text-sm font-bold min-w-[2rem] uppercase tracking-tighter">{playbackRate}x</span>
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full mb-3 right-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[100px] py-2 animate-in fade-in slide-in-from-bottom-2">
              {speeds.map(s => (
                <button key={s} onClick={() => { onSpeedChange(s); setShowSpeedMenu(false); }} className={`w-full text-left px-5 py-2.5 text-sm font-bold transition-colors ${playbackRate === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            title={t.videoTracks}
            onClick={() => { setShowTrackMenu(!showTrackMenu); setShowSpeedMenu(false); setShowSizeMenu(false); }} 
            className={`p-2.5 rounded-xl backdrop-blur-xl border border-white/10 transition-all ${activeTrackIds.length > 0 ? 'bg-blue-600/90 text-white shadow-xl' : 'bg-black/80 text-white/60 hover:text-white'}`}
          >
            <Captions className="w-5 h-5" />
          </button>
          {showTrackMenu && (
            <div className="absolute bottom-full mb-3 right-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[160px] py-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="px-4 py-2 border-b border-white/5 mb-1">
                <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">{t.videoTracks}</p>
              </div>
              {tracks.length === 0 ? (
                <p className="px-5 py-3 text-xs text-slate-500 italic">{t.noSubtitles}</p>
              ) : (
                tracks.map(t_node => {
                  const rank = activeTrackIds.indexOf(t_node.id);
                  return (
                    <button key={t_node.id} onClick={() => toggleTrack(t_node.id)} className={`w-full text-left px-5 py-3 text-sm font-medium flex items-center justify-between transition-colors ${rank !== -1 ? 'text-blue-400 bg-blue-500/5' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                      <div className="flex items-center gap-2">
                        {t_node.label}
                        {rank !== -1 && (
                          <span className={`text-[0.55rem] px-1.5 rounded-sm ${rank === 0 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                            {rank === 0 ? 'P' : 'S'}
                          </span>
                        )}
                      </div>
                      {rank !== -1 && <Check className="w-4 h-4" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {activeLines.some(l => l !== undefined) && (
        <div className="absolute bottom-[15%] left-0 right-0 flex flex-col items-center justify-end pointer-events-none px-12 transition-all z-20">
          <div className="flex flex-col items-center max-w-[90%] rounded-2xl bg-black/40 border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 backdrop-blur-sm">
            {activeLines.map((line, idx) => {
              if (!line) return null;
              // Use rem units for overlay scaling
              const primarySizeRem = 1.7 * subtitleSize;
              const secondarySizeRem = 1.4 * subtitleSize;
              const isSecondary = idx > 0;
              return (
                <div key={idx} className="px-5 py-1">
                  <p 
                    className={`leading-tight select-none font-medium text-center tracking-wide ${!isSecondary ? 'text-white' : 'text-slate-200'}`}
                    style={{ 
                      fontSize: !isSecondary ? `${primarySizeRem}rem` : `${secondarySizeRem}rem`, 
                      opacity: !isSecondary ? 1 : secondaryOpacity
                    }}
                  >
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
