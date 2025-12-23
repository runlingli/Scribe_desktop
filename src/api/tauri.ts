import { invoke } from '@tauri-apps/api/core';

export interface MediaFile {
  id: string;
  name: string;
  path: string;
  relative_path: string;
  file_type: 'video' | 'subtitle';
  duration?: number;
}

export interface ScanResult {
  videos: MediaFile[];
  subtitles: MediaFile[];
  root_folder_name: string;
}

export async function selectFolderDialog(): Promise<string | null> {
  return await invoke<string | null>('select_folder_dialog');
}

export async function scanMediaFolder(path: string): Promise<ScanResult> {
  return await invoke<ScanResult>('scan_media_folder', { path });
}

export async function readSrtFile(path: string): Promise<string> {
  return await invoke<string>('read_srt_file', { path });
}

export async function registerVideoStream(path: string): Promise<string> {
  return await invoke<string>('register_video_stream', { path });
}
