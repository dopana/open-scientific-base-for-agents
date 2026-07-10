// ============================================================
// Open Scientific Base CLI (osb)
//
// A Rust CLI for AI agents to easily interact with the
// Open Scientific Base API. Supports authentication via
// `x-api-key` header, all 6 API endpoints, and JSON output
// for machine consumption or colored terminal for humans.
//
// Usage:
//   osb [--api-url <URL>] [--api-key <KEY>] [--json] <command>
//
// Examples:
//   osb files list
//   osb files list --category physics
//   osb files get phys-001
//   osb search "quantum mechanics"
//   osb --json search "CRISPR" --category biology
//   osb update phys-001 --title "New Title"
//   osb categories
//   osb health
// ============================================================

use clap::{Parser, Subcommand};
use colored::*;
use serde_json::Value;
use std::path::PathBuf;

// ============================================================
// CLI Argument Parsing
// ============================================================

/// Open Scientific Base CLI — interact with the scientific knowledge base API
#[derive(Parser, Debug)]
#[command(name = "osb")]
#[command(version = "0.1.0")]
#[command(about = "CLI for the Open Scientific Base API", long_about = None)]
struct Cli {
    /// API base URL (default: http://localhost:3001)
    #[arg(long, global = true, default_value = "http://localhost:3001", env = "OSB_API_URL")]
    api_url: String,

    /// API key for authentication (sent as x-api-key header)
    #[arg(long, global = true, env = "OSB_API_KEY")]
    api_key: Option<String>,

    /// Output raw JSON instead of formatted text (for agent consumption)
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// List files, optionally filtered by category
    List {
        /// Category filter (e.g. "physics", "biology")
        #[arg(long)]
        category: Option<String>,
    },

    /// Get a single file by ID with full content
    Get {
        /// File ID (e.g. "phys-001")
        id: String,
        /// Output only the markdown content (strip metadata)
        #[arg(long)]
        content_only: bool,
    },

    /// Full-text search across all files
    Search {
        /// Search query
        query: String,
        /// Optional category filter
        #[arg(long)]
        category: Option<String>,
        /// Maximum results
        #[arg(long, default_value = "20")]
        limit: usize,
    },

    /// Update a file's metadata and/or content
    Update {
        /// File ID to update
        id: String,
        /// New title
        #[arg(long)]
        title: Option<String>,
        /// File path containing new markdown content (with YAML frontmatter)
        #[arg(long)]
        content_file: Option<PathBuf>,
        /// Inline content string (markdown with YAML frontmatter)
        #[arg(long)]
        content: Option<String>,
        /// Comma-separated tags
        #[arg(long, value_delimiter = ',')]
        tags: Option<Vec<String>>,
    },

    /// List all categories with file counts
    Categories,

    /// Check API health
    Health,
}

// ============================================================
// HTTP Client
// ============================================================

struct ApiClient {
    base_url: String,
    api_key: Option<String>,
    client: reqwest::Client,
}

impl ApiClient {
    fn new(base_url: String, api_key: Option<String>) -> Self {
        Self {
            base_url,
            api_key,
            client: reqwest::Client::new(),
        }
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );
        if let Some(ref key) = self.api_key {
            headers.insert(
                "x-api-key",
                reqwest::header::HeaderValue::from_str(key).unwrap(),
            );
        }
        headers
    }

    async fn get(&self, path: &str) -> Result<String, String> {
        let url = format!("{}{}", self.base_url, path);
        let response = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        if !status.is_success() {
            return Err(format!("HTTP {}: {}", status.as_u16(), body));
        }
        Ok(body)
    }

    async fn post(&self, path: &str, body: &str) -> Result<String, String> {
        let url = format!("{}{}", self.base_url, path);
        let response = self
            .client
            .post(&url)
            .headers(self.headers())
            .body(body.to_owned())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        if !status.is_success() {
            return Err(format!("HTTP {}: {}", status.as_u16(), body));
        }
        Ok(body)
    }
}

// ============================================================
// Output Formatting
// ============================================================

fn print_json(value: &Value) {
    println!(
        "{}",
        serde_json::to_string_pretty(value).unwrap_or_default()
    );
}

fn print_json_raw(text: &str) {
    println!("{}", text);
}

fn format_file_summary(v: &Value) -> String {
    let id = v["id"].as_str().unwrap_or("?").green();
    let title = v["title"].as_str().unwrap_or("?");
    let cat = v["category"].as_str().unwrap_or("?").blue();
    let ver = v["version"].as_str().unwrap_or("?");
    let updated = v["last_updated"].as_str().unwrap_or("?");
    let tags: Vec<&str> = v["tags"]
        .as_array()
        .map(|t| t.iter().filter_map(|x| x.as_str()).collect())
        .unwrap_or_default();
    let tag_str = if tags.is_empty() {
        String::new()
    } else {
        format!(" [{}]", tags.join(", ").yellow())
    };

    format!(
        "  {}  {}  v{} • {}{}",
        id, title, ver, updated, tag_str
    )
}

fn format_category(c: &Value) -> String {
    let name = c["name"].as_str().unwrap_or("?").blue().bold();
    let count = c["count"].as_u64().unwrap_or(0);
    let plural = if count == 1 { "file" } else { "files" };
    format!("  {}  {} {}", name, count, plural)
}

// ============================================================
// Command Handlers
// ============================================================

async fn handle_list(api: &ApiClient, category: Option<String>, json_mode: bool) -> Result<(), String> {
    let path = match category {
        Some(ref cat) => format!("/api/files?category={}", cat),
        None => "/api/files".to_string(),
    };
    let body = api.get(&path).await?;

    if json_mode {
        print_json_raw(&body);
        return Ok(());
    }

    let value: Value = serde_json::from_str(&body).map_err(|e| format!("JSON error: {}", e))?;

    if let Some(files) = value.as_array() {
        if files.is_empty() {
            println!("  No files found.");
            return Ok(());
        }
        println!(
            "{}",
            format!("Files ({})", files.len()).bold().underline()
        );
        for file in files {
            println!("{}", format_file_summary(file));
        }
        println!();
    }
    Ok(())
}

async fn handle_get(
    api: &ApiClient,
    id: String,
    content_only: bool,
    json_mode: bool,
) -> Result<(), String> {
    let body = api.get(&format!("/api/files/{}", id)).await?;

    if json_mode {
        if content_only {
            let value: Value = serde_json::from_str(&body).map_err(|e| format!("JSON error: {}", e))?;
            if let Some(content) = value["content"].as_str() {
                let stripped = strip_frontmatter(content);
                print!("{}", stripped);
            }
        } else {
            print_json_raw(&body);
        }
        return Ok(());
    }

    let value: Value = serde_json::from_str(&body).map_err(|e| format!("JSON error: {}", e))?;

    if content_only {
        if let Some(content) = value["content"].as_str() {
            let stripped = strip_frontmatter(content);
            print!("{}", stripped);
        }
        return Ok(());
    }

    let id = value["id"].as_str().unwrap_or("?").green().bold();
    let title = value["title"].as_str().unwrap_or("?").bold();
    let category = value["category"].as_str().unwrap_or("?").blue();
    let version = value["version"].as_str().unwrap_or("?");
    let updated = value["last_updated"].as_str().unwrap_or("?");

    println!();
    println!("  {}  {}", id, title);
    println!("  {}  v{} • Updated {}", category, version, updated);
    println!();

    // Tags
    if let Some(tags) = value["tags"].as_array() {
        if !tags.is_empty() {
            let tag_str: Vec<&str> = tags.iter().filter_map(|t| t.as_str()).collect();
            println!("  Tags: {}", tag_str.join(", ").yellow());
            println!();
        }
    }

    // Content preview
    if let Some(content) = value["content"].as_str() {
        let cleaned = strip_frontmatter(content);
        let preview: String = cleaned.chars().take(1000).collect();
        if preview.len() < cleaned.len() {
            println!("  {} (first 1000 chars, use --content-only for full)", "--- Content Preview ---".bold().underline());
        } else {
            println!("  {}", "--- Content ---".bold().underline());
        }
        println!("{}", preview);
        if preview.len() < cleaned.len() {
            println!("  ... {} more chars", cleaned.len() - preview.len());
        }
        println!();
    }

    println!("  Path: {}", value["path"].as_str().unwrap_or("?").dimmed());
    println!();

    Ok(())
}

async fn handle_search(
    api: &ApiClient,
    query: String,
    category: Option<String>,
    limit: usize,
    json_mode: bool,
) -> Result<(), String> {
    let mut body = serde_json::json!({
        "query": query,
        "limit": limit,
    });
    if let Some(ref cat) = category {
        body["category"] = serde_json::json!(cat);
    }

    let response = api
        .post("/api/search", &body.to_string())
        .await?;

    if json_mode {
        print_json_raw(&response);
        return Ok(());
    }

    let value: Value = serde_json::from_str(&response).map_err(|e| format!("JSON error: {}", e))?;

    if let Some(files) = value.as_array() {
        if files.is_empty() {
            println!("  No results for query: {}", query.yellow());
            return Ok(());
        }
        println!(
            "{}",
            format!("Search results for \"{}\" ({})", query, files.len())
                .bold()
                .underline()
        );
        for file in files {
            println!("{}", format_file_summary(file));
        }
        println!();
    }
    Ok(())
}

async fn handle_update(
    api: &ApiClient,
    id: String,
    title: Option<String>,
    content_file: Option<PathBuf>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    json_mode: bool,
) -> Result<(), String> {
    // Read content from file if provided
    let content = if let Some(file_path) = content_file {
        Some(
            std::fs::read_to_string(&file_path)
                .map_err(|e| format!("Failed to read file '{}': {}", file_path.display(), e))?,
        )
    } else {
        content
    };

    let mut payload = serde_json::json!({
        "id": id,
    });

    if let Some(ref t) = title {
        payload["title"] = serde_json::json!(t);
    }
    if let Some(ref c) = content {
        payload["content"] = serde_json::json!(c);
    }
    if let Some(ref t) = tags {
        payload["tags"] = serde_json::json!(t);
    }

    let response = api
        .post("/api/files/update", &payload.to_string())
        .await?;

    if json_mode {
        print_json_raw(&response);
        return Ok(());
    }

    let value: Value = serde_json::from_str(&response).map_err(|e| format!("JSON error: {}", e))?;

    let id = value["id"].as_str().unwrap_or("?").green().bold();
    let version = value["version"].as_str().unwrap_or("?");
    let updated = value["last_updated"].as_str().unwrap_or("?");

    println!();
    println!("  ✅ Updated {} → v{} ({})", id, version, updated);
    println!();

    Ok(())
}

async fn handle_categories(api: &ApiClient, json_mode: bool) -> Result<(), String> {
    let body = api.get("/api/categories").await?;

    if json_mode {
        print_json_raw(&body);
        return Ok(());
    }

    let value: Value = serde_json::from_str(&body).map_err(|e| format!("JSON error: {}", e))?;

    if let Some(categories) = value.as_array() {
        if categories.is_empty() {
            println!("  No categories found.");
            return Ok(());
        }
        println!("{}", "Categories".bold().underline());
        for cat in categories {
            println!("{}", format_category(cat));
        }
        println!();
    }
    Ok(())
}

async fn handle_health(api: &ApiClient, json_mode: bool) -> Result<(), String> {
    let body = api.get("/api/health").await?;

    if json_mode {
        print_json_raw(&body);
        return Ok(());
    }

    let value: Value = serde_json::from_str(&body).map_err(|e| format!("JSON error: {}", e))?;

    let status = value["status"].as_str().unwrap_or("?").green().bold();
    let service = value["service"].as_str().unwrap_or("?").blue();
    let version = value["version"].as_str().unwrap_or("?");

    println!();
    println!("  Status:  {}", status);
    println!("  Service: {}", service);
    println!("  Version: {}", version);
    println!();

    Ok(())
}

// ============================================================
// Utilities
// ============================================================

/// Strip YAML frontmatter from markdown content
fn strip_frontmatter(content: &str) -> String {
    if content.starts_with("---") {
        if let Some(end) = content[3..].find("\n---") {
            return content[3 + end + 4..].trim_start().to_string();
        }
    }
    content.to_string()
}

// ============================================================
// Entrypoint
// ============================================================

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    let api = ApiClient::new(cli.api_url, cli.api_key);
    let json_mode = cli.json;

    let result = match cli.command {
        Commands::List { category } => handle_list(&api, category, json_mode).await,
        Commands::Get { id, content_only } => handle_get(&api, id, content_only, json_mode).await,
        Commands::Search {
            query,
            category,
            limit,
        } => handle_search(&api, query, category, limit, json_mode).await,
        Commands::Update {
            id,
            title,
            content_file,
            content,
            tags,
        } => handle_update(&api, id, title, content_file, content, tags, json_mode).await,
        Commands::Categories => handle_categories(&api, json_mode).await,
        Commands::Health => handle_health(&api, json_mode).await,
    };

    if let Err(e) = result {
        eprintln!("{} {}", "Error:".red().bold(), e);
        std::process::exit(1);
    }
}
