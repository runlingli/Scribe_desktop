
import React, { useState, useMemo } from 'react';
import { FolderOpen, PlayCircle, FileVideo, ChevronRight, ChevronDown, Folder, SortAsc, Calendar } from 'lucide-react';
import { VideoFileEntry, ExplorerNode, UILanguage } from '../types';
import { formatTimeCompact } from '../utils/videoUtils';
import { translations } from '../utils/translations';

interface FileExplorerProps {
  tree: ExplorerNode[];
  currentVideoId?: string;
  currentFolderName: string;
  onSelect: (video: VideoFileEntry) => void;
  uiLanguage: UILanguage;
}

type SortBy = 'name' | 'date';

const NodeItem: React.FC<{ 
  node: ExplorerNode; 
  depth: number; 
  currentVideoId?: string; 
  onSelect: (video: VideoFileEntry) => void 
}> = ({ node, depth, currentVideoId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (node.type === 'folder') {
    return (
      <div className="select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/40 rounded-lg transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
          )}
          <Folder className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-blue-500' : 'text-slate-600'}`} />
          <span className="text-[12px] font-medium text-slate-400 group-hover:text-slate-200 truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="mt-0.5 animate-in fade-in slide-in-from-left-1 duration-200">
            {node.children.map((child, i) => (
              <NodeItem key={child.path + i} node={child} depth={depth + 1} currentVideoId={currentVideoId} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const video = node.video!;
  const isActive = currentVideoId === video.id;

  return (
    <button
      onClick={() => onSelect(video)}
      className={`w-full group flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all border ${
        isActive 
          ? 'bg-blue-600/10 border-blue-500/20 text-blue-100 shadow-sm' 
          : 'hover:bg-slate-800/30 border-transparent text-slate-500 hover:text-slate-300'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <PlayCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
      <div className="flex-1 text-left overflow-hidden">
        <p className="text-[12px] font-medium truncate leading-tight">{video.name}</p>
        {video.duration !== undefined && video.duration > 0 && (
          <span className="text-[9px] text-slate-600 font-mono opacity-60 group-hover:opacity-100 mt-1 block">
            {formatTimeCompact(video.duration)}
          </span>
        )}
      </div>
    </button>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ tree, currentVideoId, currentFolderName, onSelect, uiLanguage }) => {
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const t = translations[uiLanguage];

  const sortNodes = (nodes: ExplorerNode[]): ExplorerNode[] => {
    return [...nodes].sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        const timeA = a.video?.file.lastModified || 0;
        const timeB = b.video?.file.lastModified || 0;
        return timeB - timeA;
      }
    }).map(node => {
      if (node.children) {
        return { ...node, children: sortNodes(node.children) };
      }
      return node;
    });
  };

  const sortedTree = useMemo(() => sortNodes(tree), [tree, sortBy]);

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest truncate">
            {currentFolderName === 'No Folder Selected' ? t.noFolder : currentFolderName}
          </h2>
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button 
            onClick={() => setSortBy('name')} 
            title={t.sortByName}
            className={`p-1 rounded-md transition-all ${sortBy === 'name' ? 'bg-slate-800 text-blue-400 border border-white/5' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <SortAsc className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setSortBy('date')} 
            title={t.sortByDate}
            className={`p-1 rounded-md transition-all ${sortBy === 'date' ? 'bg-slate-800 text-blue-400 border border-white/5' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <Calendar className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
        {sortedTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 p-4 text-center opacity-40">
            <FileVideo className="w-8 h-8 mb-1" />
            <p className="text-[11px] italic">{t.noMediaIndexed}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sortedTree.map((node, i) => (
              <NodeItem key={node.path + i} node={node} depth={0} currentVideoId={currentVideoId} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
