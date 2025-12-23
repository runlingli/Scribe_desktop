use axum::{
    Router,
    extract::{Path as AxumPath, State},
    http::{StatusCode, header, HeaderMap},
    response::Response,
    routing::get,
    body::Body,
};
use tower_http::cors::CorsLayer;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use std::sync::Arc;
use std::collections::HashMap;
use uuid::Uuid;

pub struct StreamingServer {
    file_registry: Arc<tokio::sync::RwLock<HashMap<String, String>>>,
    port: u16,
}

impl StreamingServer {
    pub async fn new(port: u16) -> Result<Self, String> {
        let file_registry = Arc::new(tokio::sync::RwLock::new(HashMap::new()));

        let app = Router::new()
            .route("/stream/:id", get(stream_video))
            .layer(CorsLayer::permissive())
            .with_state(file_registry.clone());

        let addr = format!("127.0.0.1:{}", port);

        // Spawn the server in the background
        let registry_clone = file_registry.clone();
        tokio::spawn(async move {
            let listener = tokio::net::TcpListener::bind(&addr)
                .await
                .expect("Failed to bind streaming server");

            axum::serve(listener, app)
                .await
                .expect("Failed to start streaming server");
        });

        Ok(Self {
            file_registry: registry_clone,
            port,
        })
    }

    pub async fn register_file(&self, file_path: &str) -> String {
        let id = Uuid::new_v4().to_string();
        self.file_registry.write().await.insert(id.clone(), file_path.to_string());
        format!("http://127.0.0.1:{}/stream/{}", self.port, id)
    }
}

async fn stream_video(
    State(registry): State<Arc<tokio::sync::RwLock<HashMap<String, String>>>>,
    AxumPath(id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, StatusCode> {
    println!("Streaming request for ID: {}", id);

    // Get file path from registry
    let file_path = registry.read().await
        .get(&id)
        .cloned()
        .ok_or_else(|| {
            println!("File ID not found in registry: {}", id);
            StatusCode::NOT_FOUND
        })?;

    println!("Streaming file: {}", file_path);

    let mut file = File::open(&file_path).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let file_size = file.metadata().await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .len();

    let mime_type = mime_guess::from_path(&file_path)
        .first_or_octet_stream()
        .to_string();

    // Handle range requests for seeking
    if let Some(range_header) = headers.get(header::RANGE) {
        if let Ok(range_str) = range_header.to_str() {
            if let Some(range) = parse_range(range_str, file_size) {
                file.seek(std::io::SeekFrom::Start(range.start)).await
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                let length = range.end - range.start + 1;
                let mut buffer = vec![0u8; length as usize];
                file.read_exact(&mut buffer).await
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                return Ok(Response::builder()
                    .status(StatusCode::PARTIAL_CONTENT)
                    .header(header::CONTENT_TYPE, mime_type)
                    .header(header::CONTENT_LENGTH, length)
                    .header(header::CONTENT_RANGE,
                        format!("bytes {}-{}/{}", range.start, range.end, file_size))
                    .header(header::ACCEPT_RANGES, "bytes")
                    .body(Body::from(buffer))
                    .unwrap());
            }
        }
    }

    // Full file response
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_type)
        .header(header::CONTENT_LENGTH, file_size)
        .header(header::ACCEPT_RANGES, "bytes")
        .body(Body::from(buffer))
        .unwrap())
}

fn parse_range(range_str: &str, file_size: u64) -> Option<Range> {
    // Parse "bytes=0-1023" format
    let range_str = range_str.strip_prefix("bytes=")?;
    let parts: Vec<&str> = range_str.split('-').collect();

    if parts.len() != 2 {
        return None;
    }

    let start = parts[0].parse::<u64>().ok()?;
    let end = if parts[1].is_empty() {
        file_size - 1
    } else {
        parts[1].parse::<u64>().ok()?
    };

    Some(Range { start, end })
}

struct Range {
    start: u64,
    end: u64,
}
