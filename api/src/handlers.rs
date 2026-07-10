// ============================================================
// API Handlers: Axum request handlers for the Open Scientific Base
// ============================================================

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::frontmatter;
use crate::mock::DataStore;
use crate::models::*;

/// Shared application state
pub type AppState = Arc<DataStore>;

/// Custom error type that maps to HTTP error responses
#[derive(Debug)]
pub struct AppError {
    pub status: StatusCode,
    pub message: String,
}

impl axum::response::IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let body = Json(ErrorResponse {
            error: self.message,
            code: self.status.as_u16(),
        });
        (self.status, body).into_response()
    }
}

impl AppError {
    fn not_found(msg: impl Into<String>) -> Self {
        AppError {
            status: StatusCode::NOT_FOUND,
            message: msg.into(),
        }
    }

    fn bad_request(msg: impl Into<String>) -> Self {
        AppError {
            status: StatusCode::BAD_REQUEST,
            message: msg.into(),
        }
    }

    fn internal(msg: impl Into<String>) -> Self {
        AppError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: msg.into(),
        }
    }
}

/// GET /api/files
/// List all files, optionally filtered by category
pub async fn list_files(
    State(store): State<AppState>,
    Query(params): Query<CategoryParams>,
) -> Result<Json<Vec<FileSummary>>, AppError> {
    let files = store.list(params.category.as_deref());
    Ok(Json(files))
}

/// GET /api/categories
/// List all available categories with file counts
pub async fn list_categories(
    State(store): State<AppState>,
) -> Json<Vec<crate::mock::CategoryInfo>> {
    Json(store.categories())
}

/// GET /api/files/:id
/// Get a single file's full content and metadata
pub async fn get_file(
    State(store): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<FileEntry>, AppError> {
    store
        .get(&id)
        .ok_or_else(|| AppError::not_found(format!("File '{}' not found", id)))
}

/// POST /api/search
/// Full-text search across file titles and content
pub async fn search_files(
    State(store): State<AppState>,
    Json(payload): Json<SearchQuery>,
) -> Result<Json<Vec<FileSummary>>, AppError> {
    if payload.query.trim().is_empty() {
        return Err(AppError::bad_request("Search query cannot be empty"));
    }
    let results = store.search(&payload.query, payload.category.as_deref());
    Ok(Json(results))
}

/// POST /api/files/update
/// Update a file's metadata and/or content.
///
/// When `content` is provided, the system validates the YAML frontmatter
/// within the content to ensure it conforms to the strict schema before
/// accepting the update. This protects the knowledge base from malformed
/// agent submissions.
pub async fn update_file(
    State(store): State<AppState>,
    Json(payload): Json<UpdateRequest>,
) -> Result<Json<FileEntry>, AppError> {
    // If content is provided, validate its YAML frontmatter first
    if let Some(ref content) = payload.content {
        frontmatter::parse_frontmatter(content).map_err(|e| {
            AppError::bad_request(format!(
                "Content validation failed: {}. Please ensure the markdown starts with valid YAML frontmatter.",
                e
            ))
        })?;
    }

    store
        .update(payload)
        .map_err(|e| AppError::bad_request(e))
}

/// GET /api/health
/// Health check endpoint
pub async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "open-scientific-base",
        "version": "0.1.0"
    }))
}
