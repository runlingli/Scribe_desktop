
import React, { useState, useEffect } from 'react';
import { Square, X, Copy, Languages as LanguagesIcon } from 'lucide-react';
import { UILanguage } from '../types';

interface TitleBarProps {
  uiLanguage: UILanguage;
  onLanguageToggle: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ uiLanguage, onLanguageToggle }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // 获取初始最大化状态
    if (window.electron) {
      window.electron.isMaximized().then(setIsMaximized);
      
      // 监听最大化状态变化
      window.electron.onMaximizedChange(setIsMaximized);
    }

    return () => {
      // 清理监听器
      if (window.electron) {
        window.electron.removeMaximizedListener();
      }
    };
  }, []);

  const handleMinimize = () => {
    console.log('Minimize clicked', window.electron);
    if (window.electron) {
      window.electron.minimize();
    } else {
      console.error('window.electron is not available');
    }
  };
  
  const handleMaximize = () => {
    console.log('Maximize clicked', window.electron);
    if (window.electron) {
      window.electron.maximize();
    } else {
      console.error('window.electron is not available');
    }
  };
  
  const handleClose = () => {
    console.log('Close clicked', window.electron);
    if (window.electron) {
      window.electron.close();
    } else {
      console.error('window.electron is not available');
    }
  };

  return (
    <div 
      className="h-8 w-full bg-slate-950 flex items-center justify-between border-b border-slate-900 select-none z-[200]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          Scribe
        </span>
      </div>

      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Language Toggle in TitleBar */}
        <button 
          onClick={onLanguageToggle}
          title={uiLanguage === 'en' ? 'Switch to Chinese' : '切换至英文'}
          className="h-full px-3 flex items-center gap-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-900 transition-all border-r border-slate-900/50"
        >
          <LanguagesIcon className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            {uiLanguage === 'en' ? 'EN' : '中文'}
          </span>
        </button>

        <button 
          onClick={handleMinimize}
          className="h-full px-4 flex items-center justify-center text-slate-500 hover:bg-slate-800 transition-colors"
        >
          <div className="w-3 h-[1.5px] bg-current" />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full px-4 flex items-center justify-center text-slate-500 hover:bg-slate-800 transition-colors"
        >
          {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
        </button>
        <button 
          onClick={handleClose}
          className="h-full px-4 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
