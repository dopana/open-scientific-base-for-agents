# Implementation Roadmap

> **Purpose:** Track phased implementation progress across all components.
> **Updated:** 2026-07-11

---

## Phase 1 — Core Rust API ✅ COMPLETE

**Goal:** Functional REST API with full CRUD + search capabilities.

| Task | Status | Notes |
|------|--------|-------|
| Rust project scaffolding (Cargo.toml, modules) | ✅ Done | Axum 0.8, Tokio, Serde |
| Route configuration (main.rs) | ✅ Done | 6 routes: health, files, search, update, categories |
| Request handlers (handlers.rs) | ✅ Done | All endpoints with error handling |
| Data models (models.rs) | ✅ Done | FileEntry, FileSummary, SearchQuery, UpdateRequest |
| In-memory mock store (mock.rs) | ✅ Done | RwLock<Vec<FileEntry>> with 9 embedded files |
| Health check endpoint | ✅ Done | `GET /api/health` |
| File listing with category filter | ✅ Done | `GET /api/files?category=physics` |
| Single file retrieval | ✅ Done | `GET /api/files/{id}` |
| Full-text search | ✅ Done | `POST /api/search` (term matching) |
| File update with version bump | ✅ Done | `POST /api/files/update` |
| Category listing with counts | ✅ Done | `GET /api/categories` |
| CORS configuration | ✅ Done | Permissive for dev (`Allow-Origin: *`) |
| Structured logging | ✅ Done | `tracing` crate with env filter |
| D1 schema definition | ✅ Done | `schema.sql` with FTS5 + triggers |
| Wrangler configuration | ✅ Done | `wrangler.toml` with D1 bindings |

---

## Phase 2 — React Frontend UI ✅ COMPLETE

**Goal:** Beautiful, responsive UI for browsing and viewing scientific knowledge.

| Task | Status | Notes |
|------|--------|-------|
| Rsbuild + React 19 + TypeScript 6 setup | ✅ Done | Fast Rust-based bundler |
| Tailwind CSS 4 integration | ✅ Done | Utility-first styling |
| `api.ts` — typed API client | ✅ Done | 5 functions matching API endpoints |
| `types.ts` — TypeScript interfaces | ✅ Done | Mirrors Rust models |
| `config.ts` — category config + utilities | ✅ Done | 5 categories with icons/colors |
| `Header` component | ✅ Done | Search bar, branding, file counter, Ctrl+K shortcut |
| `Sidebar` component | ✅ Done | Category navigation, connection status |
| `FileList` component | ✅ Done | Loading, empty, error, and populated states |
| `FileViewer` component | ✅ Done | Full markdown rendering |
| Markdown parser (blocks) | ✅ Done | h1-h3, p, code, ul, ol, blockquote, hr |
| Inline markdown renderer | ✅ Done | bold, code, links (no dangerouslySetInnerHTML) |
| Dark theme styling | ✅ Done | Slate-950 background, indigo accents |
| Custom scrollbars | ✅ Done | Thin scrollbar across browsers |
| SVG accessibility | ✅ Done | role="img" + title on all SVGs |
| Biome lint clean | ✅ Done | 0 errors across 22 files |
| Production build | ✅ Done | 255 kB (81 kB gzipped) |

---

## Phase 3 — YAML Frontmatter Parser ✅ COMPLETE

**Goal:** Strict validation of knowledge file metadata for agent submissions.

| Task | Status | Notes |
|------|--------|-------|
| `serde_yaml` dependency | ✅ Done | v0.9 |
| `frontmatter.rs` module | ✅ Done | Parser + validator + error types |
| `Frontmatter` struct with `deny_unknown_fields` | ✅ Done | Rejects unknown YAML keys |
| YAML delimiter parsing | ✅ Done | `---` block detection |
| ID format validation | ✅ Done | `{prefix}-{number}` pattern |
| Semantic version validation | ✅ Done | `X.Y.Z` format |
| ISO date validation | ✅ Done | `YYYY-MM-DD` format |
| Tags non-empty validation | ✅ Done | At least 1 tag required |
| Category-directory consistency | ✅ Done | Parent dir vs `category` field |
| Recursive file discovery | ✅ Done | `discover_files()` with `visit_dirs()` |
| Unit tests | ✅ Done | 5 tests covering valid/invalid inputs |
| Frontmatter validation on update endpoint | ✅ Done | `handlers.rs` validates before update |
| Disk-based file loading | ✅ Done | `load_from_disk()` in `mock.rs` |
| Embedded mock data fallback | ✅ Done | `include_str!` fallback |

---

## Phase 4 — GitHub Actions & D1 Sync 🔄 IN PROGRESS

**Goal:** Automated sync between Git and Cloudflare D1.

| Task | Status | Notes |
|------|--------|-------|
| D1 creation step | ✅ Done | `npx wrangler d1 create scientific-base` |
| Schema deployment | ✅ Done | `--file=api/schema.sql --remote` |
| Frontmatter parsing in Python | ✅ Done | PyYAML + regex extraction |
| UPSERT logic | ✅ Done | `INSERT ... ON CONFLICT(id) DO UPDATE` |
| PyYAML dependency install | ✅ Done | `python3 -m pip install pyyaml` |
| Summary reporting | ✅ Done | File count in GITHUB_STEP_SUMMARY |
| **CI/CD triggers** | ⏳ Pending | Push to main on data/** |
| **Cloudflare secrets** | ⏳ Pending | CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID |
| **Manual workflow testing** | ⏳ Pending | Run workflow from GitHub UI |

---

## Phase 5 — Cloudflare Workers Deployment 📋 PLANNED

**Goal:** Deploy Rust API to Cloudflare Workers edge network.

| Task | Status | Notes |
|------|--------|-------|
| Evaluate `worker` crate | 📋 Planned | Bridge Axum to Workers |
| Replace `axum::serve` with `worker::event` | 📋 Planned | WASM-compatible entrypoint |
| Wire D1 bindings | 📋 Planned | Replace mock.rs with D1 queries |
| CORS hardening for production | 📋 Planned | Restrict origins |
| Worker deployment | 📋 Planned | `npx wrangler deploy` |
| Load testing | 📋 Planned | K6 or similar |
| **Blocker: Rust WASM compilation** | ⚠️ Research | need `worker` crate compatibility |

---

## Phase 6 — Git Sync Backend 📋 PLANNED

**Goal:** Bidirectional sync between API updates and Git repository.

| Task | Status | Notes |
|------|--------|-------|
| GitHub Content API integration | 📋 Planned | `POST /repos/{owner}/{repo}/contents/{path}` |
| Async commit on file update | 📋 Planned | Background task after D1 write |
| Webhook handler for Git-first updates | 📋 Planned | Trigger D1 refresh on push |
| Conflict resolution strategy | 📋 Planned | Last-write-wins vs version check |
| Audit trail | 📋 Planned | Log all agent modifications |

---

## Phase 7 — Multi-Model AI Integration 📋 PLANNED

> **Note:** This phase extends the base into an AI-first platform. While Phases 1–6 focus on building and deploying the knowledge base, Phase 7 focuses on making it natively consumable by AI agents through industry-standard protocols.

**Goal:** Enable AI agents to autonomously discover and use the knowledge base.

| Task | Status | Notes |
|------|--------|-------|
| MCP (Model Context Protocol) server | 📋 Planned | Let LLMs discover files as tools |
| Tool definitions for each endpoint | 📋 Planned | Tool descriptions for function calling |
| Context window optimization | 📋 Planned | Smart truncation for large files |
| Agent authentication & rate limiting | 📋 Planned | API keys for agent access |
| Agent usage analytics | 📋 Planned | Track queries, updates, errors |

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ Done | Completed and verified |
| 🔄 In Progress | Actively being worked on |
| ⏳ Pending | Ready but blocked or untested |
| 📋 Planned | Documented but not started |
| ⚠️ Research | Needs investigation before starting |
