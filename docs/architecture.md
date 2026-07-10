# Architecture

## System Architecture Overview

The Open Scientific Base follows a **three-tier architecture** with a clear separation of concerns:

```
┌──────────────────────────────────────────────────────────┐
│                    AI Agents / Clients                     │
│   (LLMs, Scripts, Other Services — HTTP/JSON over TCP)    │
└──────────────────────────┬───────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  HTTP/REST  │
                    │  JSON API   │
                    └──────┬──────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│                 API Layer (Rust / Axum)                    │
│                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Router    │──▶  Handlers    │──▶  Data Store       │  │
│  │  (main.rs) │  │  (handlers)  │  │  (mock / D1)     │  │
│  └────────────┘  └──────────────┘  └────────┬─────────┘  │
│                                              │             │
│  ┌───────────────────────────────────────────┘             │
│  │  ┌──────────────┐  ┌─────────────────────┐             │
│  │  │  Frontmatter │  │  Models (Serde)     │             │
│  │  │  Parser      │  │  Request/Response   │             │
│  │  └──────────────┘  └─────────────────────┘             │
└──────────────────────────┬───────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐      ┌─────────▼─────────┐
     │  Cloudflare D1  │      │  Git (Source of    │
     │  (Production)   │      │  Truth / Markdown) │
     │  SQLite + FTS5  │      │  data/*.md files   │
     └─────────────────┘      └───────────────────┘
              ▲                         │
              │     ┌───────────────┐   │
              └─────│ GitHub Actions│◄──┘
                    │  Sync D1      │
                    └───────────────┘
```

## Component Architecture

### 1. API Layer (Rust / Axum)

The API is built with **Rust** and the **Axum** web framework, chosen for:

- **Performance**: Near-zero overhead request handling with async I/O
- **Safety**: Rust's type system prevents memory bugs and data races
- **Edge-native**: Compiles to WebAssembly for Cloudflare Workers deployment
- **Strong typing**: Serde provides compile-time JSON schema enforcement

**Modules:**

| Module | File | Responsibility |
|--------|------|----------------|
| `main.rs` | Entrypoint | Router configuration, CORS, server bind |
| `handlers.rs` | Handlers | Request processing, validation, error mapping |
| `models.rs` | Data Models | Serde-serializable request/response structs |
| `mock.rs` | Mock Store | In-memory data store for development |
| `frontmatter.rs` | Parser | YAML frontmatter parsing and validation |

### 2. Frontend Layer (React 19 + Rsbuild)

The frontend is a **single-page application** built with:

- **React 19**: Latest React with concurrent rendering
- **Rsbuild**: Fast Rust-based build tool (successor to webpack)
- **Tailwind CSS 4**: Utility-first CSS framework
- **TypeScript 6**: Full type safety

**Component Tree:**

```
App
├── Header
│   ├── Logo + Branding
│   ├── Search Bar (Ctrl+K shortcut)
│   └── File Counter
├── Sidebar
│   ├── "All Files" button
│   ├── Category filter buttons
│   └── API Connection Status
├── FileList (left panel)
│   ├── Loading State
│   ├── Empty State ("No files found")
│   ├── Error Banner
│   └── File Items (with tags, version, date)
└── FileViewer (right panel)
    ├── Empty State ("Select a file")
    ├── Loading State
    ├── File Header (metadata, tags, copy button)
    └── Markdown Content (rendered with syntax highlighting)
```

### 3. Data Layer

**Two storage backends:**

| Backend | Use Case | Technology |
|---------|----------|------------|
| In-memory Mock | Development & testing | `RwLock<Vec<FileEntry>>` |
| Cloudflare D1 | Production | SQLite + FTS5 full-text search |

**Git as Source of Truth:** All `.md` files in the `data/` directory are the canonical source. A GitHub Actions workflow (`sync-d1.yml`) syncs these to D1 on every push.

## Request Lifecycle

```
1. HTTP Request ──▶ Axum Router ──▶ Route Matching
                                             │
                                    ┌────────▼────────┐
                                    │  CORS Check     │
                                    │  (permissive)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Path/Query     │
                                    │  Extraction     │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  JSON Body      │
                                    │  Deserialization│
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Business Logic │
                                    │  & Validation   │
                                    │  (if update:    │
                                    │   parse YAML)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Data Store     │
                                    │  Operation      │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  JSON Response  │
                                    │  Serialization  │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  HTTP Response  │
                                    └─────────────────┘
```

## Data Flow for Updates

When an AI agent updates a file via `POST /api/files/update`:

```
Agent ──▶ JSON with id, content, tags ──▶ API Server
                                              │
                                  ┌───────────▼───────────┐
                                  │  1. Schema Validation  │
                                  │  serde deserialization │
                                  │  (reject bad types)    │
                                  └───────────┬───────────┘
                                              │
                                  ┌───────────▼───────────┐
                                  │  2. Frontmatter       │
                                  │     Validation         │
                                  │  parse_frontmatter()  │
                                  │  check YAML fields    │
                                  │  validate ID, version, │
                                  │  tags, category, date │
                                  └───────────┬───────────┘
                                              │
                                  ┌───────────▼───────────┐
                                  │  3. Data Store Update  │
                                  │  Update in-memory or  │
                                  │  D1 database          │
                                  │  Increment version    │
                                  └───────────┬───────────┘
                                              │
                                  ┌───────────▼───────────┐
                                  │  4. (Future) Git      │
                                  │     Commit            │
                                  │  Async GitHub commit  │
                                  │  to keep Git in sync  │
                                  └───────────────────────┘
```

## Security Model

- **CORS**: Fully open (`Allow-Origin: *`) for development
- **No Authentication**: Intended for internal/private use or VPN-gated deployment
- **Input Validation**:
  - JSON schema validation via Serde (rejects malformed requests)
  - YAML frontmatter validation (rejects unknown fields with `deny_unknown_fields`)
  - Semantic validation (ID format, version format, date format)
- **Error Handling**: Structured error responses with `{ "error": "...", "code": 400 }`

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| API Framework | Axum | 0.8 | HTTP routing & middleware |
| Runtime | Tokio | 1.x | Async I/O runtime |
| Serialization | Serde / serde_json / serde_yaml | 1.x | JSON/YAML parsing |
| Database (prod) | Cloudflare D1 | — | Serverless SQLite |
| Database (dev) | In-memory `RwLock<Vec>` | — | Local development |
| Frontend | React | 19.x | UI framework |
| Build Tool | Rsbuild | 2.x | Frontend bundling |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Linting | Biome | 2.x | Code formatting & linting |
| Testing (frontend) | Rstest | 0.10 | React testing |
| CI/CD | GitHub Actions | — | D1 sync pipeline |
| Deployment | Cloudflare Workers | — | Edge deployment |
