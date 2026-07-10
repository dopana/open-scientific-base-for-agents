// ============================================================
// Open Scientific Base API — Main Entrypoint
// Rust Axum server with in-memory mock data store
//
// Run locally: cargo run
// Deploy to Cloudflare: npx wrangler deploy
// ============================================================

mod frontmatter;
mod handlers;
mod mock;
mod models;

use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    // Initialize tracing for structured logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    // Initialize the in-memory data store
    // In production, this will be replaced with Cloudflare D1 bindings
    let store = Arc::new(mock::DataStore::new());
    let app_state = store.clone();

    // Configure CORS for frontend access
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build the router with all API endpoints
    let app = axum::Router::new()
        // Health check
        .route("/api/health", axum::routing::get(handlers::health_check))
        // File listing with optional category filter
        .route(
            "/api/files",
            axum::routing::get(handlers::list_files),
        )
        // Single file by ID
        .route(
            "/api/files/{id}",
            axum::routing::get(handlers::get_file),
        )
        // File update (atomic metadata + content update)
        .route(
            "/api/files/update",
            axum::routing::post(handlers::update_file),
        )
        // Full-text search
        .route(
            "/api/search",
            axum::routing::post(handlers::search_files),
        )
        // Categories listing
        .route(
            "/api/categories",
            axum::routing::get(handlers::list_categories),
        )
        // Shared state
        .with_state(app_state)
        // CORS layer
        .layer(cors);

    // Bind and serve
    let addr = "0.0.0.0:3001";
    tracing::info!("🚀 Open Scientific Base API listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}
