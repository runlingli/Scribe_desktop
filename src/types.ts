import { MediaFile } from './api/tauri';

export interface SubtitleLine {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  lines: SubtitleLine[];
}

export interface VideoFileEntry {
  id: string;
  name: string;
  path: string;           // Absolute file path from backend
  streamUrl?: string;     // HTTP streaming URL from backend server
  relativePath: string;
  duration?: number;
  modified_at?: number;
}

export interface ExplorerNode {
  name: string;
  type: 'folder' | 'file';
  children?: ExplorerNode[];
  video?: VideoFileEntry;
  modified_at?: number;
  path: string;
}

export type SidebarMode = 'transcript' | 'explorer' | 'settings';
export type UILanguage = 'en' | 'zh';

export interface VideoState {
  currentVideo: VideoFileEntry | null;
  playlist: VideoFileEntry[];
  folderTree: ExplorerNode[];
  srtPool: MediaFile[];  // Changed from File[] to MediaFile[] for backend integration
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  tracks: SubtitleTrack[];
  sidebarMode: SidebarMode;
  transcriptTrackIds: string[]; // Tracks shown in the right sidebar
  videoTrackIds: string[];      // Tracks shown on the video overlay
  rootFolderName: string;
  uiLanguage: UILanguage;
}

export interface SuffixConfig {
  suffix: string;
  label: string;
}
