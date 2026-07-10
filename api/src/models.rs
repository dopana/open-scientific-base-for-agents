// ============================================================
// Data Models: Strict Serde schemas for the Open Scientific Base API
// ============================================================

pub use serde::{Deserialize, Serialize};

/// Full file entry stored in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: String,
    pub path: String,
    pub title: String,
    pub category: String,
    pub tags: Vec<String>,
    pub content: String,
    pub version: String,
    pub last_updated: String,
}

/// Lightweight summary returned in list/search results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSummary {
    pub id: String,
    pub path: String,
    pub title: String,
    pub category: String,
    pub tags: Vec<String>,
    pub version: String,
    pub last_updated: String,
}

impl From<FileEntry> for FileSummary {
    fn from(file: FileEntry) -> Self {
        FileSummary {
            id: file.id,
            path: file.path,
            title: file.title,
            category: file.category,
            tags: file.tags,
            version: file.version,
            last_updated: file.last_updated,
        }
    }
}

/// Query for the search endpoint
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    20
}

/// Request payload for updating a file
#[derive(Debug, Deserialize)]
pub struct UpdateRequest {
    pub id: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
}

/// Category filter for listing files
#[derive(Debug, Deserialize)]
pub struct CategoryParams {
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: u16,
}
