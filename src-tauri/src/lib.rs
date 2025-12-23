mod commands;
mod media;

use std::sync::Arc;
use tauri::Manager;
use media::StreamingServer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Start streaming server on app initialization
            let server = tauri::async_runtime::block_on(async {
                StreamingServer::new(9527).await
            }).expect("Failed to start streaming server");

            app.manage(Arc::new(server));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::select_folder_dialog,
            commands::scan_media_folder,
            commands::read_srt_file,
            commands::register_video_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
