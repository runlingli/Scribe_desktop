
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {MessageSquare, AlertCircle, LayoutGrid, X, Settings, Plus, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import VideoPlayer from './components/VideoPlayer';
import SubtitleList from './components/SubtitleList';
import FileExplorer from './components/FileExplorer';
import TitleBar from './components/TitleBar';
import { VideoState, VideoFileEntry, SubtitleTrack, SidebarMode, SuffixConfig, ExplorerNode } from './types';
import { parseSRT } from './utils/srtParser';
import { getVideoDuration } from './utils/videoUtils';
import { translations } from './utils/translations';

const DEFAULT_SUFFIXES: SuffixConfig[] = [
  { suffix: 'zh', label: 'Chinese' },
  { suffix: 'en', label: 'English' },
  { suffix: 'jp', label: 'Japanese' },
];

const FONT_SCALES = [0.85, 1.0, 1.15, 1.3];

const App: React.FC = () => {
  const [state, setState] = useState<VideoState>({
    currentVideo: null,
    playlist: [],
    folderTree: [],
    srtPool: [],
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    tracks: [],
    sidebarMode: 'transcript',
    transcriptTrackIds: [],
    videoTrackIds: [],
    rootFolderName: 'No Folder Selected',
    uiLanguage: 'en'
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoSubtitleSize, setVideoSubtitleSize] = useState(1.0); 
  const [transcriptSubtitleSize, setTranscriptSubtitleSize] = useState(1.1);
  const [uiFontSizeScale, setUiFontSizeScale] = useState(1.0);
  const [secondaryOpacity, setSecondaryOpacity] = useState(0.8);
  const [suffixConfigs, setSuffixConfigs] = useState<SuffixConfig[]>(DEFAULT_SUFFIXES);
  const [separators, setSeparators] = useState<string[]>(['.', '_', '-']);
  const [newSeparator, setNewSeparator] = useState('');
  
  const isResizing = useRef(false);
  const t = translations[state.uiLanguage];

  useEffect(() => {
    // 20px is a solid base for desktop apps to make 'rem' comfortable
    const baseSize = 20; 
    document.documentElement.style.fontSize = `${baseSize * uiFontSizeScale}px`;
  }, [uiFontSizeScale]);

  // Tauri Native Drag and Drop Listener to bypass browser security warning
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupTauriListener = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        // Fix: Cast appWindow to any to avoid conflict with global DOM Window type and ensure onDragDrop is recognized
        const appWindow = getCurrentWindow() as any;
        
        unlisten = await appWindow.onDragDrop((event: any) => {
          if (event.payload.paths && event.payload.paths.length > 0) {
            // Since we can't get File objects directly from paths without fs plugin,
            // we'll prompt the user or attempt to map if the env allows.
            // For now, if Tauri drop is triggered, we advise the user or handle via standard input
            // but in a real Tauri app, we'd use convertFileSrc and fs.readTextFile here.
            console.log("Native paths received:", event.payload.paths);
            // If the user wants a full native experience, we'd integrate @tauri-apps/plugin-fs
          }
        });
      } catch (e) {
        console.warn("Tauri APIs not available, falling back to browser events.");
      }
    };

    setupTauriListener();

    // Disable browser default drag-drop globally to prevent security popups
    const preventDefault = (e: DragEvent) => {
      e.stopPropagation();
      e.preventDefault();
    }
    window.addEventListener('dragenter', preventDefault, true);
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    return () => {
      if (unlisten) unlisten();
      window.removeEventListener('dragenter', preventDefault, true);
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleZoomToggle = () => {
    setUiFontSizeScale(prev => {
      const currentIndex = FONT_SCALES.indexOf(prev);
      const nextIndex = (currentIndex + 1) % FONT_SCALES.length;
      return FONT_SCALES[nextIndex];
    });
  };

  const buildFolderTree = (videos: VideoFileEntry[]): ExplorerNode[] => {
    const root: ExplorerNode[] = [];
    videos.forEach(video => {
      const parts = video.relativePath.split('/');
      const pathParts = parts.slice(1); 
      let currentLevel = root;
      
      pathParts.forEach((part, index) => {
        const isFile = index === pathParts.length - 1;
        let node = currentLevel.find(n => n.name === part);
        
        if (!node) {
          node = {
            name: part,
            type: isFile ? 'file' : 'folder',
            path: parts.slice(0, index + 2).join('/'),
            children: isFile ? undefined : [],
            video: isFile ? video : undefined
          };
          currentLevel.push(node);
        }
        if (node.children) currentLevel = node.children;
      });
    });
    return root;
  };

  const findFirstVideoInTree = (nodes: ExplorerNode[]): VideoFileEntry | null => {
    const sortedNodes = [...nodes].sort((a, b) => a.name.localeCompare(b.name));
    for (const node of sortedNodes) {
      if (node.type === 'file' && node.video) {
        return node.video;
      }
      if (node.type === 'folder' && node.children) {
        const found = findFirstVideoInTree(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const matchSubtitles = async (video: VideoFileEntry, pool: File[]) => {
    const videoNameParts = video.name.split('.');
    videoNameParts.pop();
    const videoBase = videoNameParts.join('.').toLowerCase();
    const videoDir = video.relativePath.substring(0, video.relativePath.lastIndexOf('/') + 1);
    
    const matchedSrts = pool.filter(s => {
      const srtPath = (s as any).webkitRelativePath || '';
      const srtDir = srtPath.substring(0, srtPath.lastIndexOf('/') + 1);
      const srtName = s.name.toLowerCase();
      return srtDir === videoDir && srtName.startsWith(videoBase);
    });
    
    const newTracks: SubtitleTrack[] = [];
    for (const srtFile of matchedSrts) {
      const fileName = srtFile.name.toLowerCase();
      let label = 'Unknown';
      let language = 'auto';
      
      for (const config of suffixConfigs) {
        if (!config.suffix) continue;
        const isMatched = separators.some(sep => 
          fileName.endsWith(`${sep}${config.suffix.toLowerCase()}.srt`)
        );
        
        if (isMatched) {
          label = config.label || config.suffix;
          language = config.suffix;
          break;
        }
      }

      if (label === 'Unknown') {
        if (fileName === `${videoBase}.srt`) {
          label = 'Default';
        } else {
          separators.forEach(sep => {
            const parts = fileName.split(sep);
            const lastPart = parts[parts.length - 1].replace('.srt', '');
            const matchingConfig = suffixConfigs.find(c => c.suffix.toLowerCase() === lastPart);
            if (matchingConfig) {
              label = matchingConfig.label;
              language = matchingConfig.suffix;
            }
          });
        }
      }

      const text = await srtFile.text();
      newTracks.push({
        id: Math.random().toString(36).substr(2, 9),
        label,
        language,
        lines: parseSRT(text)
      });
    }
    return newTracks;
  };

  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    try {
      const fileList = Array.from(files);
      const videoFiles = fileList.filter(f => f.type.startsWith('video/'));
      const srtFiles = fileList.filter(f => f.name.endsWith('.srt'));

      if (videoFiles.length === 0 && srtFiles.length === 0) {
        setError('No compatible files found.');
        return;
      }

      const firstPath = (fileList[0] as any).webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'Local Folder';

      const newEntries: VideoFileEntry[] = await Promise.all(videoFiles.map(async f => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        file: f,
        url: URL.createObjectURL(f),
        relativePath: (f as any).webkitRelativePath || '',
        duration: await getVideoDuration(f)
      })));

      const tree = buildFolderTree(newEntries);
      const videoToPlay = findFirstVideoInTree(tree);
      let tracks: SubtitleTrack[] = [];

      if (videoToPlay) {
        tracks = await matchSubtitles(videoToPlay, srtFiles);
      }

      setState(prev => ({
        ...prev,
        currentVideo: videoToPlay,
        playlist: newEntries,
        folderTree: tree,
        srtPool: srtFiles,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        tracks,
        transcriptTrackIds: tracks.slice(0, 2).map(t => t.id),
        videoTrackIds: tracks.slice(0, 1).map(t => t.id),
        sidebarMode: tracks.length > 0 ? 'transcript' : 'explorer',
        rootFolderName: folderName
      }));
      setError(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoSelect = async (video: VideoFileEntry) => {
    setIsProcessing(true);
    try {
      const tracks = await matchSubtitles(video, state.srtPool);
      setState(prev => ({ 
        ...prev, 
        currentVideo: video, 
        currentTime: 0, 
        tracks,
        transcriptTrackIds: tracks.slice(0, 2).map(t => t.id),
        videoTrackIds: tracks.slice(0, 1).map(t => t.id),
        sidebarMode: tracks.length > 0 ? 'transcript' : 'explorer'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleLanguage = () => {
    setState(p => ({ ...p, uiLanguage: p.uiLanguage === 'en' ? 'zh' : 'en' }));
  };

  const addSeparator = () => {
    if (newSeparator && !separators.includes(newSeparator)) {
      setSeparators([...separators, newSeparator]);
      setNewSeparator('');
    }
  };

  const clearLibrary = () => {
    setState(prev => ({
      ...prev,
      currentVideo: null,
      playlist: [],
      folderTree: [],
      srtPool: [],
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      tracks: [],
      sidebarMode: 'explorer',
      transcriptTrackIds: [],
      videoTrackIds: [],
      rootFolderName: 'No Folder Selected'
    }));
  };

  const handleTranscriptTrackToggle = (id: string) => {
    setState(p => {
      const isSelected = p.transcriptTrackIds.includes(id);
      let newIds: string[];
      if (isSelected) {
        newIds = p.transcriptTrackIds.filter(i => i !== id);
      } else {
        newIds = [...p.transcriptTrackIds, id].slice(-2);
      }
      return { ...p, transcriptTrackIds: newIds };
    });
  };

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    // Limit width based on rem so it roughly scales
    if (newWidth > 200 && newWidth < 800) setSidebarWidth(newWidth);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <TitleBar 
        uiLanguage={state.uiLanguage} 
        onLanguageToggle={toggleLanguage} 
        uiZoom={uiFontSizeScale}
        onZoomToggle={handleZoomToggle}
      />
      
      <main className="flex-1 flex gap-0 h-full overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden relative group">
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4 animate-in fade-in">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <div className="absolute inset-0 blur-lg bg-blue-500/20 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-blue-200 uppercase tracking-widest animate-pulse">{t.processing}</p>
            </div>
          )}

          {!state.currentVideo && state.folderTree.length === 0 ? (
            <div 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); 
              }}
              className="flex-1 flex flex-col items-center justify-center bg-slate-900/10 hover:bg-slate-900/20 transition-all cursor-pointer"
              onClick={() => document.getElementById('folder-upload')?.click()}
            >
              <div className="p-8 rounded-3xl bg-slate-800/30 mb-6 group-hover:scale-105 transition-transform border border-white/5">
                <FolderOpen className="w-16 h-16 text-blue-500/50" />
              </div>
              <h3 className="text-2xl font-medium text-slate-400">{t.selectFolder}</h3>
              <p className="text-sm text-slate-600 mt-2">{t.openMediaLibrary}</p>
              {/* @ts-ignore */}
              <input id="folder-upload" type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {state.currentVideo ? (
                <VideoPlayer 
                  url={state.currentVideo.url} 
                  title={state.currentVideo.name}
                  onTimeUpdate={(t) => setState(p => ({ ...p, currentTime: t }))}
                  onDurationChange={(d) => setState(p => ({ ...p, duration: d }))}
                  currentTime={state.currentTime}
                  tracks={state.tracks}
                  activeTrackIds={state.videoTrackIds}
                  onTrackChange={(ids) => setState(p => ({ ...p, videoTrackIds: ids }))}
                  playbackRate={playbackRate}
                  subtitleSize={videoSubtitleSize}
                  onSpeedChange={setPlaybackRate}
                  onSizeChange={setVideoSubtitleSize}
                  onClose={() => setState(p => ({ ...p, currentVideo: null }))}
                  uiLanguage={state.uiLanguage}
                  secondaryOpacity={secondaryOpacity}
                />
              ) : (
                 <div className="flex-1 flex items-center justify-center bg-slate-900/5 text-slate-600 text-sm italic">
                   {state.uiLanguage === 'en' ? 'Select a video from the Explorer' : '从侧边栏文件浏览器中选择视频'}
                 </div>
              )}
            </div>
          )}

          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 backdrop-blur border border-red-500/30 text-red-200 p-3 rounded-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-2">
              <AlertCircle className="w-4 h-4" />
              <p className="text-xs font-medium">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        <div 
          onMouseDown={startResizing} 
          className="w-[2px] hover:w-[4px] bg-slate-900 hover:bg-blue-500/60 cursor-col-resize transition-all self-stretch z-[60] shrink-0" 
        />

        <div className="flex flex-col h-full bg-slate-950 border-l border-slate-900 overflow-hidden shrink-0" style={{ width: `${sidebarWidth}px` }}>
           <div className="flex p-2 gap-1 bg-slate-950 border-b border-slate-900">
             {[
               { mode: 'transcript' as SidebarMode, icon: <MessageSquare className="w-4 h-4" />, label: t.transcript },
               { mode: 'explorer' as SidebarMode, icon: <LayoutGrid className="w-4 h-4" />, label: t.explorer },
               { mode: 'settings' as SidebarMode, icon: <Settings className="w-4 h-4" />, label: t.settings }
             ].map(item => (
               <button 
                 key={item.mode}
                 title={item.label}
                 onClick={() => setState(p => ({ ...p, sidebarMode: item.mode }))}
                 className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
                   state.sidebarMode === item.mode 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                 }`}
               >
                 {item.icon}
               </button>
             ))}
           </div>

           <div className="flex-1 min-h-0 overflow-hidden px-2 pb-2 mt-2">
             {state.sidebarMode === 'transcript' && (
               <SubtitleList 
                 tracks={state.tracks}
                 activeTrackIds={state.transcriptTrackIds}
                 currentTime={state.currentTime}
                 subtitleSize={transcriptSubtitleSize}
                 onSizeChange={setTranscriptSubtitleSize}
                 onSeek={(time) => setState(p => ({ ...p, currentTime: time }))}
                 uiLanguage={state.uiLanguage}
                 secondaryOpacity={secondaryOpacity}
                 onOpacityChange={setSecondaryOpacity}
               />
             )}
             {state.sidebarMode === 'explorer' && (
               <FileExplorer tree={state.folderTree} currentVideoId={state.currentVideo?.id} currentFolderName={state.rootFolderName} onSelect={handleVideoSelect} uiLanguage={state.uiLanguage} />
             )}
             {state.sidebarMode === 'settings' && (
               <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden p-3 gap-4 custom-scrollbar overflow-y-auto">
                 <div className="space-y-3">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.sidebarTracks}</h3>
                   <div className="space-y-1">
                     {state.tracks.length === 0 ? (
                       <p className="text-xs text-slate-600 italic">{t.noTracks}</p>
                     ) : (
                       state.tracks.map(track => {
                        const rank = state.transcriptTrackIds.indexOf(track.id);
                        return (
                         <button 
                          key={track.id}
                          onClick={() => handleTranscriptTrackToggle(track.id)}
                          className={`w-full text-left px-3 h-10 rounded-lg text-sm flex items-center justify-between border transition-all ${
                            rank !== -1 
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-100' 
                              : 'bg-slate-950/20 border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                         >
                           <span className="flex items-center justify-between w-full">
                             {track.label}
                             {rank !== -1 && (
                               <span className={`text-[0.6rem] px-1.5 py-0.5 rounded font-black uppercase ${rank === 0 ? 'bg-blue-500/50 text-white' : 'bg-slate-700/50 text-slate-300'}`}>
                                 {rank === 0 ? t.primary : t.secondary}
                               </span>
                             )}
                           </span>
                         </button>
                        );
                       })
                     )}
                   </div>
                 </div>

                 <div className="space-y-3">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.filenameSeparators}</h3>
                   <div className="flex flex-wrap gap-2">
                     {separators.map(sep => (
                       <div key={sep} className="group flex items-center bg-blue-600/20 border border-blue-500/30 rounded-lg px-2 py-1">
                         <span className="text-sm font-mono text-blue-200">{sep}</span>
                         <button 
                           onClick={() => setSeparators(separators.filter(s => s !== sep))}
                           className="ml-1.5 p-0.5 hover:bg-white/10 rounded transition-colors"
                         >
                           <X className="w-3 h-3 text-blue-400" />
                         </button>
                       </div>
                     ))}
                   </div>
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={newSeparator}
                       onChange={(e) => setNewSeparator(e.target.value)}
                       placeholder="e.g. @"
                       className="flex-1 bg-slate-950/50 border border-slate-800 rounded px-2 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                     />
                     <button 
                       onClick={addSeparator}
                       className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors font-bold"
                     >
                       {t.add}
                     </button>
                   </div>
                 </div>

                 <div className="space-y-3 flex-1 flex flex-col min-h-0">
                   <div className="flex items-center justify-between">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.suffixMapping}</h3>
                     <button onClick={() => setSuffixConfigs([...suffixConfigs, { suffix: '', label: '' }])} className="p-1 text-blue-400 hover:text-blue-300"><Plus className="w-4 h-4" /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                     {suffixConfigs.map((cfg, idx) => (
                       <div key={idx} className="flex items-center gap-1.5 p-2 bg-slate-950/40 rounded-lg border border-white/5">
                         <input 
                           type="text" 
                           value={cfg.suffix} 
                           placeholder="zh"
                           className="w-[20%] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500/50 text-center"
                           onChange={(e) => {
                             const n = [...suffixConfigs];
                             n[idx].suffix = e.target.value;
                             setSuffixConfigs(n);
                           }}
                         />
                         <span className="text-slate-700">→</span>
                         <input 
                           type="text" 
                           value={cfg.label} 
                           placeholder="Chinese"
                           className="w-[50%] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500/50"
                           onChange={(e) => {
                             const n = [...suffixConfigs];
                             n[idx].label = e.target.value;
                             setSuffixConfigs(n);
                           }}
                         />
                         <button onClick={() => setSuffixConfigs(suffixConfigs.filter((_, i) => i !== idx))} className="p-1 text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 <button 
                   onClick={clearLibrary}
                   className="mt-4 w-full py-3 bg-red-900/10 hover:bg-red-900/20 border border-red-500/20 rounded-xl text-sm text-red-400 font-bold transition-all flex items-center justify-center gap-2 shrink-0"
                 >
                   <Trash2 className="w-4 h-4" /> {t.clearAll}
                 </button>
               </div>
             )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
