# Tasks

> **Living task tracker** for the Open Scientific Base project.
> Last updated: 2026-07-11

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| ⏳ | Pending (ready, blocked, or untested) |
| 📋 | Planned |

---

## Phase 1 — Core Rust API ✅

| Task | Status |
|------|--------|
| Rust project scaffolding (Axum, Tokio, Serde) | ✅ |
| Route configuration (6 endpoints) | ✅ |
| Request handlers with error handling | ✅ |
| Data models (FileEntry, FileSummary, etc.) | ✅ |
| In-memory mock store with 9 seed files | ✅ |
| Health check endpoint | ✅ |
| File listing with category filter | ✅ |
| Single file retrieval | ✅ |
| Full-text search | ✅ |
| File update with version bump | ✅ |
| Category listing with counts | ✅ |
| CORS configuration | ✅ |
| Structured logging (tracing) | ✅ |
| D1 schema (schema.sql + FTS5) | ✅ |
| Wrangler configuration | ✅ |

## Phase 2 — React Frontend ✅

| Task | Status |
|------|--------|
| Rsbuild + React 19 + TS 6 setup | ✅ |
| Tailwind CSS 4 integration | ✅ |
| Typed API client (api.ts) | ✅ |
| TypeScript interfaces (types.ts) | ✅ |
| Category config (config.ts) | ✅ |
| Header component | ✅ |
| Sidebar component | ✅ |
| FileList component | ✅ |
| FileViewer with markdown rendering | ✅ |
| Dark theme styling | ✅ |
| Custom scrollbars | ✅ |
| SVG accessibility | ✅ |
| 0 Biome lint errors | ✅ |
| Production build (255 kB / 81 kB gzip) | ✅ |

## Phase 3 — YAML Frontmatter Parser ✅

| Task | Status |
|------|--------|
| serde_yaml dependency | ✅ |
| Frontmatter struct with deny_unknown_fields | ✅ |
| YAML delimiter parsing (`---` blocks) | ✅ |
| ID format validation (`{prefix}-{number}`) | ✅ |
| Semantic version validation (`X.Y.Z`) | ✅ |
| ISO date validation (`YYYY-MM-DD`) | ✅ |
| Tags non-empty validation | ✅ |
| Category-directory consistency check | ✅ |
| Recursive file discovery | ✅ |
| Unit tests (5 tests) | ✅ |
| Frontmatter validation on update endpoint | ✅ |
| Disk-based file loading | ✅ |
| Embedded mock data fallback | ✅ |

## Phase 4 — GitHub Actions & D1 Sync 🔄

| Task | Status |
|------|--------|
| D1 creation step | ✅ |
| Schema deployment step | ✅ |
| Frontmatter parsing in Python | ✅ |
| UPSERT logic for D1 | ✅ |
| PyYAML dependency install | ✅ |
| Summary reporting | ✅ |
| Set up Cloudflare secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID) | ⏳ |
| Test workflow on actual push | ⏳ |

## Phase 5 — Cloudflare Workers Deployment 📋

| Task | Status |
|------|--------|
| Evaluate `worker` crate for WASM compilation | 📋 |
| Replace `axum::serve` with `worker::event` handlers | 📋 |
| Wire D1 bindings into data store | 📋 |
| CORS hardening for production | 📋 |
| Load testing (K6) | 📋 |

## Phase 6 — Git Sync Backend 📋

| Task | Status |
|------|--------|
| GitHub Content API integration | 📋 |
| Async commit on file update | 📋 |
| Webhook handler for Git-first updates | 📋 |
| Conflict resolution strategy | 📋 |
| Audit trail for agent modifications | 📋 |

## Phase 7 — Multi-Model AI Integration 📋

| Task | Status |
|------|--------|
| MCP (Model Context Protocol) server | 📋 |
| Tool definitions for each endpoint | 📋 |
| Agent authentication & rate limiting | 📋 |
| Agent usage analytics | 📋 |

## Documentation ✅ *(cross-cutting, not a numbered phase)*

- docs/README.md — documentation index ✅
- docs/architecture.md — system architecture ✅
- docs/api-reference.md — full REST API docs ✅
- docs/data-format.md — file format specification ✅
- docs/frontend-guide.md — React component guide ✅
- docs/deployment.md — Cloudflare deployment guide ✅
- docs/development.md — local dev & contributing ✅
- docs/agent-integration.md — AI agent instructions ✅
- docs/plans/architecture-plan.md — ideal architecture plan ✅
- docs/plans/implementation-roadmap.md — phased roadmap ✅
- docs/plans/frontend-roadmap.md — frontend enhancements ✅
- docs/plans/data-model-plan.md — data model decisions ✅
- docs/plans/api-design-plan.md — API design philosophy ✅
- docs/plans/testing-strategy.md — testing strategy ✅
- docs/plans/security-plan.md — security architecture ✅
- docs/plans/deployment-plan.md — deployment pipeline ✅
- docs/plans/content-expansion-plan.md — content growth strategy ✅
- docs/plans/agent-protocol-plan.md — AI agent protocol ✅

## Frontend Enhancements 📋 *(separate track)*

| Task | Status |
|------|--------|
| Code syntax highlighting in FileViewer | 📋 |
| Mobile responsive layout | 📋 |
| Keyboard navigation for file list | 📋 |
| File editing UI | 📋 |
| Dark/light theme toggle | 📋 |

---

## Current Sprint Focus

1. ✅ Complete documentation suite
2. ⏳ Set up Cloudflare secrets for CI/CD
3. ⏳ Test D1 sync workflow on an actual push
4. ⏳ Add code syntax highlighting to FileViewer
5. ⏳ Deploy frontend to Cloudflare Pages or Vercel

---

## Known Issues

- `env!("CARGO_MANIFEST_DIR")` in `mock.rs` bakes compile-time path — fine for dev, needs refactor for Workers
- `update_file` handler validates frontmatter but doesn't sync to Git yet
- No authentication layer — API is open (acceptable for internal/VPN-gated use)
- No rate limiting — could add Cloudflare Rate Limiting rules
