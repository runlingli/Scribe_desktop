use walkdir::WalkDir;
use std::path::Path;
use uuid::Uuid;
use crate::media::types::{MediaFile, MediaType, ScanResult};

pub fn scan_media_folder(folder_path: &str) -> Result<ScanResult, String> {
    let root_path = Path::new(folder_path);

    // Validate folder exists
    if !root_path.exists() || !root_path.is_dir() {
        return Err("Invalid folder path".to_string());
    }

    let root_folder_name = root_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown Folder")
        .to_string();

    let mut videos = Vec::new();
    let mut subtitles = Vec::new();

    // Recursive walk
    for entry in WalkDir::new(root_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let extension = path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        let relative_path = path.strip_prefix(root_path)
            .ok()
            .and_then(|p| p.to_str())
            .map(|s| s.replace('\\', "/"))
            .unwrap_or_default();

        match extension.as_deref() {
            Some("mp4") | Some("mkv") | Some("avi") | Some("mov") |
            Some("webm") | Some("flv") | Some("wmv") | Some("m4v") => {
                videos.push(MediaFile {
                    id: Uuid::new_v4().to_string(),
                    name: path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    path: path.to_string_lossy().to_string(),
                    relative_path: format!("{}/{}", root_folder_name, relative_path),
                    file_type: MediaType::Video,
                    duration: None, // Will be populated later
                });
            }
            Some("srt") => {
                subtitles.push(MediaFile {
                    id: Uuid::new_v4().to_string(),
                    name: path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    path: path.to_string_lossy().to_string(),
                    relative_path: format!("{}/{}", root_folder_name, relative_path),
                    file_type: MediaType::Subtitle,
                    duration: None,
                });
            }
            _ => {}
        }
    }

    Ok(ScanResult {
        videos,
        subtitles,
        root_folder_name,
    })
}
