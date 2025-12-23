use tauri::command;
use std::sync::Arc;
use crate::media::{ScanResult, StreamingServer};

#[command]
pub async fn select_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog()
        .file()
        .blocking_pick_folder();

    match folder {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[command]
pub async fn scan_media_folder(path: String) -> Result<ScanResult, String> {
    crate::media::scanner::scan_media_folder(&path)
}

#[command]
pub async fn read_srt_file(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read SRT file: {}", e))
}

#[command]
pub async fn register_video_stream(
    path: String,
    state: tauri::State<'_, Arc<StreamingServer>>
) -> Result<String, String> {
    Ok(state.register_file(&path).await)
}
