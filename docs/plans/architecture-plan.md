# Edge-Native Architecture Plan

> **Status:** ✅ Phase 1 (Complete), ✅ Phase 2 (Complete), 🔄 Phase 3 (In Progress)
> **Last Updated:** 2026-07-11

## Overview

This document outlines the high-performance, edge-native architecture powering the Open Scientific Base. The system is designed for **Cloudflare Workers**, **Cloudflare D1** (Serverless SQL), and **Rust (Axum)** — delivering sub-10ms database operations and global low latency for AI agents.

## Architecture Diagram

```
[ AI Agent ]
     │
     ├──► HTTP Requests (JSON) ──► [ Cloudflare Worker (Rust / Axum) ]
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
         [ Cloudflare D1 (SQLite) ]                 [ GitHub API / Git Storage ]
         (Fast Search, Tags, Manifest)               (Raw Markdown Files)

```

### Data Flow

1. **AI Agents** send HTTP/JSON requests to the Cloudflare Worker
2. **Worker** routes requests through Axum to appropriate handlers
3. **Reads** are served from D1 (low-latency SQLite with FTS5 full-text search)
4. **Writes** update D1 and asynchronously commit to Git (source of truth)
5. **GitHub Actions** syncs D1 when humans edit markdown directly in Git

---

## Core Architecture Decisions

### Why Cloudflare Workers + Rust?

| Consideration | Decision |
|---------------|----------|
| **Latency** | Edge deployment → <50ms global response times |
| **Database** | D1 (SQLite) → zero cold starts, sub-10ms queries |
| **Language** | Rust → performance + safety + WASM compilation |
| **Framework** | Axum → type-safe routing, tower middleware |
| **Source of Truth** | Git → version control, collaboration, audit trail |

### Why D1 over Traditional SQL?

- **Serverless**: No connection pooling, no provisioning
- **Global**: Replicas close to users
- **FTS5**: Built-in full-text search for AI agent queries
- **SQLite syntax**: Simple, well-understood

---

## Directory Structure

```
open-scientific-base-for-agents/
│
├── .agent/                    # System Prompts & SOPs for Agents
│   ├── read-rules.md          # How agents read from the base
│   └── write-rules.md         # How agents write to the base
│
├── api/                       # Rust Axum Web Service
│   ├── src/
│   │   ├── main.rs            # Worker entrypoint & routing
│   │   ├── handlers.rs        # Request handlers
│   │   ├── models.rs          # Strict Serde schemas
│   │   ├── mock.rs            # In-memory data store (dev)
│   │   └── frontmatter.rs     # YAML frontmatter parser
│   ├── Cargo.toml
│   └── wrangler.toml          # Cloudflare deployment config
│
├── frontend/                  # React 19 SPA
│   ├── src/
│   │   ├── App.tsx            # Main app with state management
│   │   ├── api.ts             # Typed API client
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── config.ts          # Category config & utilities
│   │   └── components/
│   │       ├── Header.tsx     # Search bar & branding
│   │       ├── Sidebar.tsx    # Category navigation
│   │       ├── FileList.tsx   # File listing panel
│   │       └── FileViewer.tsx # Markdown content viewer
│   ├── package.json
│   └── rsbuild.config.ts
│
├── data/                      # Scientific Knowledge Base (MD Files)
│   ├── physics/
│   │   ├── quantum-mechanics.md
│   │   └── special-relativity.md
│   ├── biology/
│   │   ├── crispr-gene-editing.md
│   │   └── evolutionary-biology.md
│   ├── chemistry/
│   │   └── organic-chemistry-basics.md
│   ├── computer-science/
│   │   ├── transformer-architecture.md
│   │   └── quantum-algorithms.md
│   └── mathematics/
│       ├── linear-algebra-foundations.md
│       └── statistical-methods.md
│
├── docs/                      # Documentation
│   ├── plans/                 # Planning documents (this directory)
│   ├── architecture.md
│   ├── api-reference.md
│   ├── data-format.md
│   ├── frontend-guide.md
│   ├── deployment.md
│   ├── development.md
│   └── agent-integration.md
│
├── .github/workflows/
│   └── sync-d1.yml            # D1 sync pipeline
│
└── tasks.md                   # Living task tracker
```

### Data File Format

Every markdown file maintains structured YAML frontmatter:

```markdown
---
id: phys-001
title: Quantum Mechanics Intro
category: physics
tags: ["quantum", "physics"]
last_updated: 2026-07-11
version: 1.0.0
---

# Quantum Mechanics Intro
Content goes here...
```

**Validation:**
- `#[serde(deny_unknown_fields)]` — rejects unknown YAML keys
- `id` must match `{prefix}-{number}` (e.g., `phys-001`)
- `version` must be semver `X.Y.Z`
- `last_updated` must be `YYYY-MM-DD`
- `tags` must have at least 1 entry
- `category` must match parent directory name

---

## API Design

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/files` | List files (optional `?category=` filter) |
| `GET` | `/api/files/{id}` | Get single file by ID |
| `POST` | `/api/files/update` | Update file metadata/content |
| `POST` | `/api/search` | Full-text search |
| `GET` | `/api/categories` | List categories with file counts |

### Response Schema

**File List (`GET /api/files`) → `200 OK`:**

```json
[
  {
    "id": "phys-001",
    "path": "data/physics/quantum-mechanics.md",
    "title": "Introduction to Quantum Mechanics",
    "tags": ["quantum", "physics"],
    "version": "1.1.0",
    "last_updated": "2026-07-11"
  }
]
```

### Search (`POST /api/search`)

**Request:**
```json
{
  "query": "quantum computing",
  "category": "physics"
}
```

**Implementation (mock in-memory / D1 FTS5 in production):**

In development, the API uses simple substring matching across `title`, `content`, and `tags`. In production, D1's FTS5 engine provides ranking and stemming.

### Update Protocol (`POST /api/files/update`)

1. **Schema Validation** — Serde deserializes and validates the JSON body
2. **Frontmatter Validation** — YAML frontmatter parsed and validated by `frontmatter::parse_frontmatter()`
3. **Database Update** — Metadata and content stored in D1
4. **(Future) Git Commit** — Async push to GitHub via API

---

## Database Schema (D1)

```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL,           -- JSON array as text
    content TEXT NOT NULL,
    content_html TEXT,            -- Optional pre-rendered HTML
    version TEXT NOT NULL DEFAULT '1.0.0',
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- FTS5 for fast agent queries
CREATE VIRTUAL TABLE files_fts USING fts5(
    id UNINDEXED,
    title,
    content,
    content='files',
    tokenize='porter unicode61'
);

-- Sync triggers
CREATE TRIGGER files_ai AFTER INSERT ON files BEGIN
    INSERT INTO files_fts(id, title, content) VALUES (new.id, new.title, new.content);
END;
-- ... (delete and update triggers also defined)
```

---

## Implementation Roadmap

### ✅ Phase 1: Core Rust API (Complete)
- Rust project with Axum web framework
- All CRUD endpoints (list, get, search, update, categories, health)
- In-memory mock data store with 9 embedded scientific files
- CORS configured for local development
- D1 schema definition (`schema.sql`)
- Wrangler configuration

### ✅ Phase 2: Frontend UI (Complete)
- React 19 SPA with Rsbuild + Tailwind CSS
- Four components: Header, Sidebar, FileList, FileViewer
- Full Markdown rendering (headings, code blocks, lists, inline formatting)
- Search with debounce, category filtering, keyboard shortcuts
- Dark theme with custom scrollbars and accessibility features
- Loading, empty, and error states for all components

### ✅ Phase 3: YAML Frontmatter Parser (Complete)
- `frontmatter.rs` module with strict YAML parsing
- `#[serde(deny_unknown_fields)]` — rejects unknown keys
- Semantic validation: ID format, version semver, date format, tags
- Category-directory consistency enforcement
- Frontmatter validation on update endpoint
- Fallback disk loading from `data/` directory

### 🔄 Phase 4: GitHub Actions & D1 Sync (In Progress)
- `.github/workflows/sync-d1.yml` created
- D1 provisioning and schema deployment
- PyYAML-based frontmatter parsing for sync script
- Requires: Cloudflare secrets, wrangler worker deployment

### 📋 Phase 5: Cloudflare Workers Deployment (Planned)
- Add `worker` crate for WASM compilation
- Replace `axum::serve` with `worker::event` handlers
- Wire D1 bindings into the data store
- Deploy Rust worker to Cloudflare's edge network

### 📋 Phase 6: Git Sync Backend (Planned)
- Async GitHub API commits for file updates
- GitHub webhook handler for real-time sync
- Conflict resolution strategy
- Audit trail for all agent modifications

---

## Security Model

| Layer | Measure |
|-------|---------|
| **CORS** | Permissive for dev (`*`); restrict for production |
| **Auth** | None currently (intended for internal/VPN-gated use) |
| **Input Validation** | Serde JSON schema + `deny_unknown_fields` YAML |
| **Error Handling** | Structured `{error, code}` responses, no stack leaks |

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (local) | <10ms | ✅ <5ms |
| API Response Time (edge) | <50ms | ⏳ Pending Workers deploy |
| Search Query Time | <100ms | ✅ <1ms (in-memory) |
| D1 Query Time | <10ms | ⏳ Pending D1 deploy |
| Frontend Load Time | <2s | ✅ <1s (255 kB gzip 81 kB) |
| Concurrent Users | 1000+ | ⏳ Pending load testing |
