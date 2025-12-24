
import React, { useState, useMemo } from 'react';
import { FolderOpen, PlayCircle, FileVideo, ChevronRight, ChevronDown, SortAsc, Calendar } from 'lucide-react';
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

const calculateTotalDuration = (node: ExplorerNode): number => {
  if (node.type === 'file') {
    return node.video?.duration || 0;
  }
  return (node.children || []).reduce((acc, child) => acc + calculateTotalDuration(child), 0);
};

const NodeItem: React.FC<{ 
  node: ExplorerNode; 
  depth: number; 
  currentVideoId?: string; 
  onSelect: (video: VideoFileEntry) => void 
}> = ({ node, depth, currentVideoId, onSelect }) => {
  const isVideoInFolder = (n: ExplorerNode): boolean => {
    if (n.type === 'file') return n.video?.id === currentVideoId;
    return n.children?.some(child => isVideoInFolder(child)) || false;
  };

  const [isOpen, setIsOpen] = useState(() => isVideoInFolder(node));
  // calculate total duration
  const totalDuration = useMemo(() => calculateTotalDuration(node), [node]);



  if (node.type === 'folder') {
    return (
      <div className="select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-1 px-1 py-1 hover:bg-slate-800/40 rounded-lg transition-colors group"
          style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200 truncate">{node.name}</span>

          {totalDuration > 0 && (
            <span className="text-[0.6rem] text-slate-600 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded">
              {formatTimeCompact(totalDuration)}
            </span>
          )}
          
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
      className={`w-full group flex items-center gap-2 px-1 py-1.5 rounded-lg transition-all border ${
        isActive 
          ? 'bg-blue-600/10 border-blue-500/20 text-blue-100 shadow-sm' 
          : 'hover:bg-slate-800/30 border-transparent text-slate-500 hover:text-slate-300'
      }`}
      style={{ paddingLeft: `${depth * 0.6}rem` }}
    >
      <PlayCircle className={`w-5 h-5 shrink-0 mt-0.5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
      <div className="flex-1 text-left overflow-hidden">
        <p className="text-sm font-medium truncate leading-tight">{video.name}</p>
        {video.duration !== undefined && video.duration > 0 && (
          <span className="text-[0.65rem] text-slate-600 font-mono opacity-60 group-hover:opacity-100 mt-1 block">
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

  const allFilesTotalDuration = useMemo(() => {
    return tree.reduce((acc, node) => acc + calculateTotalDuration(node), 0);
  }, [tree]);

  const sortNodes = (nodes: ExplorerNode[]): ExplorerNode[] => {
    return [...nodes]
      .sort((a, b) => {
        if (sortBy === 'date') {
          const timeA = a.type === 'file' ? (a.video?.modified_at || 0) : (a.modified_at || 0);
          const timeB = b.type === 'file' ? (b.video?.modified_at || 0) : (b.modified_at || 0);
          
          if (timeB !== timeA) {
            return timeB - timeA;
          }
        }
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
  
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      })
      .map((node) => {
        if (node.children) {
          return { ...node, children: sortNodes(node.children) };
        }
        return node;
      });
  };

  const sortedTree = useMemo(() => {
    console.log("Sorting tree...");
    return sortNodes(tree);
  }, [tree, sortBy]);

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
      <div className="p-2 border-b border-slate-800 flex items-center bg-slate-900/30">
        
        <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />

        <div className="flex-1 min-w-0 px-2 flex flex-col justify-center">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest truncate">
            {currentFolderName === 'No Folder Selected' ? t.noFolder : currentFolderName}
          </h2>
          
          {allFilesTotalDuration > 0 && (
            <div className="text-[0.6rem] text-blue-400/60 font-mono flex gap-1 items-center whitespace-nowrap">
              {formatTimeCompact(allFilesTotalDuration)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={() => setSortBy('name')} 
            className={`p-1.5 rounded-md ${sortBy === 'name' ? 'bg-slate-800 text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <SortAsc className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setSortBy('date')} 
            className={`p-1.5 rounded-md ${sortBy === 'date' ? 'bg-slate-800 text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
        {sortedTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 p-4 text-center opacity-40">
            <FileVideo className="w-10 h-10 mb-2" />
            <p className="text-sm italic">{t.noMediaIndexed}</p>
          </div>
        ) : (
          <div className="space-y-1">
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
