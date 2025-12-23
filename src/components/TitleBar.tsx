
import { useState, useEffect } from 'react';
import { Square, X, Copy, Languages as LanguagesIcon, Type } from 'lucide-react';
import { UILanguage } from '../types';

interface TitleBarProps {
  uiLanguage: UILanguage;
  onLanguageToggle: () => void;
  uiZoom: number;
  onZoomToggle: () => void;
  isMaximized?: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ 
  uiLanguage, 
  onLanguageToggle, 
  uiZoom, 
  onZoomToggle, 
}) => {
  const [appWindow, setAppWindow] = useState<any>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    // Check if in Tauri environment
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      import('@tauri-apps/api/window').then(async (m) => {
        const win = await m.getCurrentWindow();
        setAppWindow(win);
        const maximized = await win.isMaximized();
        setIsMaximized(maximized);
      }).catch(err => {
        console.warn('Tauri API not available:', err);
      });
    }
  }, []);

  const handleMinimize = () => appWindow?.minimize();
  const handleMaximize = () => {
    appWindow?.toggleMaximize()
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => appWindow?.close();

  return (
    <div 
      data-tauri-drag-region
      className="h-10 w-full bg-slate-950 flex items-center justify-between border-b border-slate-900 select-none z-[200] cursor-default shrink-0"
    >
      <div className="flex items-center gap-2 px-4 pointer-events-none">
        <span className="text-[0.8rem] font-bold text-slate-500 uppercase tracking-[0.2em]">
          Scribe 
        </span>
      </div>

      <div className="flex items-center h-full">
        {/* UI Text Scale Toggle */}
        <button 
          onClick={onZoomToggle}
          title="Adjust Text Size"
          className="h-full px-2 flex items-center gap-2 text-slate-500 hover:text-blue-400 hover:bg-slate-900 transition-all border-r border-slate-900/50"
        >
          <Type className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-[0.8rem] font-black uppercase tracking-tighter">
            {Math.round(uiZoom * 100)}%
          </span>
        </button>

        {/* Language Toggle */}
        <button 
          onClick={onLanguageToggle}
          title={uiLanguage === 'en' ? 'Switch to Chinese' : '切换至英文'}
          className="h-full px-4 flex items-center gap-2 text-slate-500 hover:text-blue-400 hover:bg-slate-900 transition-all border-r border-slate-900/50"
        >
          <LanguagesIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-[0.8rem] font-black uppercase tracking-tighter">
            {uiLanguage === 'en' ? 'EN' : '中文'}
          </span>
        </button>

        {/* Window Controls */}
        <button 
          onClick={handleMinimize}
          disabled={!appWindow}
          className={`h-full px-5 flex items-center justify-center transition-colors ${appWindow ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-800'}`}
        >
          <div className="w-4 h-[2px] bg-current" />
        </button>
        <button 
          onClick={handleMaximize}
          disabled={!appWindow}
          className={`h-full px-5 flex items-center justify-center transition-colors ${appWindow ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-800'}`}
        >
          {isMaximized ? <Copy className="w-4 h-4 rotate-180" /> : <Square className="w-4 h-4" />}
        </button>
        <button 
          onClick={handleClose}
          disabled={!appWindow}
          className={`h-full px-5 flex items-center justify-center transition-colors ${appWindow ? 'text-slate-500 hover:bg-red-600 hover:text-white' : 'text-slate-800'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
