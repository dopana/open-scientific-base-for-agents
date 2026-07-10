# API Design Plan

> **Status:** Implemented in `main.rs` and `handlers.rs`
> **Updated:** 2026-07-11

## Design Philosophy

1. **Flat over nested** — Simple, discoverable endpoints without complex URL hierarchies
2. **JSON everywhere** — Request and response bodies are always JSON
3. **Consistent errors** — Every error returns `{ "error": "...", "code": NNN }`
4. **Stateless** — No sessions, no cookies, no authentication (for now)
5. **Self-documenting** — Clear naming, predictable patterns

## Endpoint Map

```
/api/
├── health          GET     → Health check
├── files           GET     → List files (optional ?category=)
├── files/{id}      GET     → Single file with content
├── files/update    POST    → Create or update a file
├── search          POST    → Full-text search
└── categories      GET     → Categories with counts
```

### Why These Specific Endpoints?

| Endpoint | Purpose | Agent Use Case |
|----------|---------|---------------|
| `GET /api/health` | Monitoring, load balancing | Check if API is alive before sending work |
| `GET /api/files` | Discovery | Find what knowledge exists by category |
| `GET /api/files/{id}` | Retrieval | Read full content of a specific file |
| `POST /api/files/update` | Writing | Update knowledge with validated content |
| `POST /api/search` | Discovery | Find relevant files by topic |
| `GET /api/categories` | Taxonomy | Understand the knowledge structure |

## URL Design Decisions

### /api/files vs /api/files/{id}

**Decision:** Flat `/api/files` for listing, `/api/files/{id}` for detail

**Rationale:**
- REST convention: collection + detail endpoints
- Clear separation: list returns summaries (`FileSummary`), detail returns full content (`FileEntry`)
- Avoids embedding large content bodies in list responses

### /api/files/update (POST) vs PUT /api/files/{id}

**Decision:** `POST /api/files/update` with `id` in body

**Rationale:**
- Consistent with the pattern of having `id` in the request body (agents send JSON)
- Avoids URL encoding issues with IDs containing special characters
- Allows partial updates via `UpdateRequest` (only send fields to change)

### /api/search (POST) vs GET /api/search?q=

**Decision:** `POST /api/search` with JSON body

**Rationale:**
- Search queries can be complex (multiple fields, filters)
- POST body isn't logged in server access logs (privacy for sensitive queries)
- Consistent with other POST endpoints that accept JSON
- No URL encoding issues with special characters in queries

## Request/Response Patterns

### Listing Pattern

```json
// GET /api/files → 200
[
  { "id": "phys-001", "path": "...", "title": "...", "tags": [...], "version": "1.0.0", "last_updated": "..." }
]

// GET /api/files?category=physics → 200 (filtered)
// GET /api/files?category=invalid → 200 (empty array)
```

### Detail Pattern

```json
// GET /api/files/phys-001 → 200
{ "id": "phys-001", ..., "content": "---\n...\n---\n\n# Content..." }

// GET /api/files/does-not-exist → 404
{ "error": "File 'does-not-exist' not found", "code": 404 }
```

### Search Pattern

```json
// POST /api/search → 200
{ "query": "quantum", "category": "physics" }
→ [{ "id": "phys-001", ... }]

// POST /api/search → 400 (empty query)
{ "error": "Search query cannot be empty", "code": 400 }
```

### Update Pattern

```json
// POST /api/files/update → 200
{ "id": "phys-001", "title": "...", "content": "...", "tags": [...] }
→ { "id": "phys-001", ..., "version": "1.0.1", "last_updated": "2026-07-11" }

// POST /api/files/update → 400 (invalid frontmatter)
{ "error": "Content validation failed: ...", "code": 400 }

// POST /api/files/update → 400 (not found)
{ "error": "File 'phys-999' not found", "code": 400 }
```

## Error Handling Strategy

### Error Type Hierarchy

```
AppError (handlers.rs)
├── not_found(msg)     → 404
├── bad_request(msg)   → 400
└── internal(msg)      → 500
```

### Error Response Design

```json
{
  "error": "Human-readable, actionable message for agents and developers",
  "code": 400
}
```

**Design choices:**
- `error` is a descriptive string (not a code), making debugging easier for agents
- `code` mirrors the HTTP status code for convenience (agents can parse either)
- No stack traces or internal details exposed in production

### Edge Cases Handled

| Scenario | Response | Rationale |
|----------|----------|-----------|
| Empty search query | 400 Bad Request | Can't search for nothing |
| Non-existent file ID | 404 Not Found | Clear error with the ID |
| Invalid YAML frontmatter | 400 Bad Request | Detailed validation error |
| Missing required field | 400 Bad Request | Serde auto-validates on deserialization |
| Unknown field in YAML | 400 Bad Request | `deny_unknown_fields` catches stray keys |
| Category filter with no matches | 200 (empty array) | Not an error — zero is valid |

## Versioning Strategy

### API Versioning

**Decision:** No URL-based versioning for v1 (e.g., `/api/v1/files`)

**Rationale:**
- Single-tenant, single-instance deployment
- Backward-compatible changes only
- If breaking changes are needed, add `/api/v2/` routes alongside v1

### Content Versioning

**Decision:** Semver in the `version` field, auto-incremented

```
Initial:    1.0.0
Minor edit: 1.0.1 (auto-increment on POST /api/files/update)
Significant: 1.1.0 (manual — agent sets version in frontmatter)
Major:      2.0.0 (manual — agent sets version in frontmatter)
```

## Rate Limiting

**Current:** None
**Planned:** Cloudflare Rate Limiting rules at the edge

### Future Rate Limit Design

| Endpoint | Limit | Scope | Burst |
|----------|-------|-------|-------|
| `GET /api/files` | 100/min | Per IP | 20 |
| `GET /api/files/{id}` | 100/min | Per IP | 20 |
| `POST /api/search` | 60/min | Per IP | 10 |
| `POST /api/files/update` | 10/min | Per IP | 3 |

## CORS Policy

**Development:** `Allow-Origin: *`
**Production:** Restrict to specific frontend domain

```rust
// Current (development) — fully permissive
let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods(Any)
    .allow_headers(Any);

// Future (production) — restrict to frontend
let cors = CorsLayer::new()
    .allow_origin(["https://scientific-base.pages.dev".parse().unwrap()])
    .allow_methods([Method::GET, Method::POST])
    .allow_headers([header::CONTENT_TYPE]);
```

## Future Considerations

### Planned Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/files/batch` | POST | Batch file retrieval for bulk agent operations |
| `/api/diff/{id}` | GET | Version diff between two revisions |
| `/api/stats` | GET | Knowledge base statistics (total files, top tags, etc.) |
| `/api/export` | GET | Export entire knowledge base as archive |
| `/api/ingest` | POST | Import new files from markdown |

### API Metrics to Track

- Request count per endpoint
- Search query latency
- Update success/failure rate
- Most searched terms (for content gap analysis)
- Error rate by type (400 vs 404 vs 500)
