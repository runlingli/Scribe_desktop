
import React from 'react';
import { Monitor, ShieldCheck, HardDrive } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="px-8 py-5 flex items-center justify-between bg-slate-900/40 backdrop-blur-2xl border-b border-slate-800 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-700 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20 border border-white/10">
          <Monitor className="text-white w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">
            SCRIBE <span className="text-blue-500">DESKTOP</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none">
              Privacy First / Local Decoding
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
           <div className="flex items-center gap-1.5 hover:text-slate-300 cursor-help transition-colors">
             <HardDrive className="w-3 h-3" />
             LOCAL_MODE
           </div>
        </div>
        <div className="h-5 w-[1px] bg-slate-800"></div>
        <div className="px-4 py-1.5 bg-blue-500 text-white text-[11px] font-black rounded-lg shadow-lg shadow-blue-600/20 uppercase tracking-widest">
          PRO EDITION
        </div>
      </div>
    </header>
  );
};

export default Header;
