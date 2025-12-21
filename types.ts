
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
  file: File;
  url: string;
  relativePath: string;
  duration?: number;
}

export interface ExplorerNode {
  name: string;
  type: 'folder' | 'file';
  children?: ExplorerNode[];
  video?: VideoFileEntry;
  path: string;
}

export type SidebarMode = 'transcript' | 'explorer' | 'settings';

export interface VideoState {
  currentVideo: VideoFileEntry | null;
  playlist: VideoFileEntry[];
  folderTree: ExplorerNode[];
  srtPool: File[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  tracks: SubtitleTrack[];
  sidebarMode: SidebarMode;
  transcriptTrackIds: string[]; // Tracks shown in the right sidebar
  videoTrackIds: string[];      // Tracks shown on the video overlay
  rootFolderName: string;
}

export interface SuffixConfig {
  suffix: string;
  label: string;
}
