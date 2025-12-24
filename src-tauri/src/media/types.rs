use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaFile {
    pub id: String,
    pub name: String,
    pub path: String,           // Absolute file path
    pub relative_path: String,  // Path relative to root folder
    pub file_type: MediaType,
    pub duration: Option<f64>,
    pub modified_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Video,
    Subtitle,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub videos: Vec<MediaFile>,
    pub subtitles: Vec<MediaFile>,
    pub root_folder_name: String,
}
