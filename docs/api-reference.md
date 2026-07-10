# API Reference

## Overview

The Open Scientific Base exposes a **RESTful JSON API** over HTTP. All endpoints are prefixed with `/api/`. The API is designed to be consumed by both human-facing UI and automated AI agents.

**Base URL (local):** `http://localhost:3001`  
**Base URL (production):** `https://{worker}.workers.dev`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/files` | List files (optional category filter) |
| `GET` | `/api/files/{id}` | Get single file by ID |
| `POST` | `/api/files/update` | Update file metadata/content |
| `POST` | `/api/search` | Full-text search |
| `GET` | `/api/categories` | List categories with file counts |

---

## `GET /api/health`

Health check endpoint for monitoring and load balancers.

### Request

```
GET /api/health
```

### Response `200 OK`

```json
{
  "status": "ok",
  "service": "open-scientific-base",
  "version": "0.1.0"
}
```

---

## `GET /api/files`

Returns a list of all files with metadata summaries. Optionally filtered by category.

### Request

```
GET /api/files
GET /api/files?category=physics
GET /api/files?category=biology
GET /api/files?category=chemistry
GET /api/files?category=computer-science
GET /api/files?category=mathematics
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | `string` | No | Filter by scientific category |

### Response `200 OK`

Returns an array of `FileSummary` objects. The `content` field is **not** included in list responses (use `GET /api/files/{id}` for full content).

```json
[
  {
    "id": "phys-001",
    "path": "data/physics/quantum-mechanics.md",
    "title": "Introduction to Quantum Mechanics",
    "category": "physics",
    "tags": ["quantum", "mechanics", "wave-function", "schrödinger"],
    "version": "1.1.0",
    "last_updated": "2026-07-11"
  },
  {
    "id": "bio-001",
    "path": "data/biology/crispr-gene-editing.md",
    "title": "CRISPR-Cas9 Gene Editing",
    "category": "biology",
    "tags": ["crispr", "gene-editing", "biotechnology", "dna"],
    "version": "1.2.0",
    "last_updated": "2026-07-09"
  }
]
```

---

## `GET /api/files/{id}`

Returns a single file with full content and metadata.

### Request

```
GET /api/files/phys-001
GET /api/files/bio-002
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | File ID (e.g. `phys-001`, `cs-002`) |

### Response `200 OK`

```json
{
  "id": "phys-001",
  "path": "data/physics/quantum-mechanics.md",
  "title": "Introduction to Quantum Mechanics",
  "category": "physics",
  "tags": ["quantum", "mechanics", "wave-function", "schrödinger"],
  "content": "---\nid: phys-001\ntitle: Introduction to Quantum Mechanics\n...\n---\n\n# Introduction to Quantum Mechanics\n\n## Overview\n\nQuantum mechanics is a fundamental theory...",
  "version": "1.1.0",
  "last_updated": "2026-07-11"
}
```

### Response `404 Not Found`

```json
{
  "error": "File 'invalid-id' not found",
  "code": 404
}
```

---

## `POST /api/search`

Full-text search across file titles, content, and tags.

### Request

```
POST /api/search
Content-Type: application/json

{
  "query": "quantum computing",
  "category": "physics",
  "limit": 20
}
```

### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | `string` | Yes | — | Search terms (space-separated, all terms must match) |
| `category` | `string` | No | `null` | Optional category filter |
| `limit` | `integer` | No | `20` | Maximum number of results |

### Response `200 OK`

Returns an array of `FileSummary` objects matching the search query.

```json
[
  {
    "id": "phys-001",
    "path": "data/physics/quantum-mechanics.md",
    "title": "Introduction to Quantum Mechanics",
    "category": "physics",
    "tags": ["quantum", "mechanics", "wave-function", "schrödinger"],
    "version": "1.1.0",
    "last_updated": "2026-07-11"
  }
]
```

### Response `400 Bad Request`

```json
{
  "error": "Search query cannot be empty",
  "code": 400
}
```

### Search Behavior

- **Token matching**: The query is split into whitespace-separated terms. A file matches only if **all** terms are found.
- **Case-insensitive**: Searches are case-insensitive.
- **Scanned fields**: `title`, `content`, and `tags` are searched.
- **Production (D1)**: Uses SQLite FTS5 full-text search with ranking.
- **Development (mock)**: Uses simple substring matching.

---

## `POST /api/files/update`

Update a file's metadata and/or content. The system validates the YAML frontmatter when `content` is provided.

### Request

```
POST /api/files/update
Content-Type: application/json

{
  "id": "phys-001",
  "title": "Updated Title",
  "content": "---\nid: phys-001\ntitle: Updated Title\ncategory: physics\ntags: [\"quantum\", \"mechanics\", \"new-tag\"]\nlast_updated: 2026-07-11\nversion: 1.1.0\n---\n\n# Updated Content\n\nNew scientific knowledge here...",
  "tags": ["quantum", "mechanics", "new-tag"]
}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | **Yes** | File ID to update |
| `title` | `string` | No | New title (optional) |
| `content` | `string` | No | Full markdown including YAML frontmatter. If provided, frontmatter is validated |
| `tags` | `string[]` | No | New tags array (optional) |

### Frontmatter Validation

When `content` is provided, the API validates:

1. **YAML syntax**: Must be parseable by `serde_yaml`
2. **Required fields**: `id`, `title`, `category`, `tags`, `last_updated`, `version`
3. **Strict schema**: Unknown YAML keys are **rejected** (`deny_unknown_fields`)
4. **ID format**: Must match `{prefix}-{number}` (e.g., `phys-001`)
5. **Version format**: Must be semver `X.Y.Z`
6. **Date format**: `last_updated` must be `YYYY-MM-DD`
7. **Tags**: Must not be empty (at least one tag required)

### Response `200 OK`

Returns the updated `FileEntry` with incremented version:

```json
{
  "id": "phys-001",
  "path": "data/physics/quantum-mechanics.md",
  "title": "Updated Title",
  "category": "physics",
  "tags": ["quantum", "mechanics", "new-tag"],
  "content": "---\nid: phys-001\n...",
  "version": "1.1.1",
  "last_updated": "2026-07-11"
}
```

> **Note**: The `version` field is automatically incremented (patch bump).
> The `last_updated` field is automatically set to the current date.

### Response `400 Bad Request` — Invalid Frontmatter

```json
{
  "error": "Content validation failed: Frontmatter validation error: Invalid `id` format: 'bad-id'. Expected `{prefix}-{number}` (e.g. `phys-001`). Please ensure the markdown starts with valid YAML frontmatter.",
  "code": 400
}
```

### Response `400 Bad Request` — File Not Found

```json
{
  "error": "File 'non-existent-id' not found",
  "code": 400
}
```

---

## `GET /api/categories`

Returns all available scientific categories with file counts.

### Request

```
GET /api/categories
```

### Response `200 OK`

```json
[
  { "name": "biology", "count": 2 },
  { "name": "chemistry", "count": 1 },
  { "name": "computer-science", "count": 2 },
  { "name": "mathematics", "count": 2 },
  { "name": "physics", "count": 2 }
]
```

Categories are sorted alphabetically. Counts reflect the number of files in each category.

---

## Error Handling

All errors follow a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "code": 400
}
```

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Invalid input, missing fields, validation failure |
| `404` | Not Found | File ID doesn't exist |
| `500` | Internal Server Error | Unexpected server failure |

---

## Data Models

### `FileEntry`

Full file record returned by `GET /api/files/{id}` and `POST /api/files/update`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (e.g. `phys-001`) |
| `path` | `string` | Relative file path from repo root |
| `title` | `string` | Human-readable title |
| `category` | `string` | Scientific category |
| `tags` | `string[]` | Search tags |
| `content` | `string` | Full markdown including YAML frontmatter |
| `version` | `string` | Semantic version (X.Y.Z) |
| `last_updated` | `string` | ISO-8601 date (YYYY-MM-DD) |

### `FileSummary`

Lightweight summary returned by list and search endpoints. Same as `FileEntry` **without** the `content` field.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `path` | `string` | Relative file path |
| `title` | `string` | Human-readable title |
| `category` | `string` | Scientific category |
| `tags` | `string[]` | Search tags |
| `version` | `string` | Semantic version |
| `last_updated` | `string` | ISO-8601 date |

### `SearchQuery`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | `string` | Yes | — | Search terms |
| `category` | `string` | No | `null` | Category filter |
| `limit` | `integer` | No | `20` | Max results |

### `UpdateRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Target file ID |
| `title` | `string` | No | New title |
| `content` | `string` | No | Full markdown (frontmatter validated) |
| `tags` | `string[]` | No | New tags |

### `CategoryInfo`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Category name (e.g., `physics`) |
| `count` | `integer` | Number of files in this category |

### `ErrorResponse`

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | Human-readable error message |
| `code` | `integer` | HTTP status code |

---

## Rate Limiting

The API currently has **no rate limiting**. This is intentional for development. In production, consider adding rate limiting at the Cloudflare edge (e.g., Cloudflare Rate Limiting rules).

## CORS

The API is configured with permissive CORS for development:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: *`
- `Access-Control-Allow-Headers: *`

## Example Workflows

### Agent: Find and Read a File

```bash
# 1. Search for relevant files
curl -s -X POST http://localhost:3001/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "quantum mechanics", "category": "physics"}' \
  | jq '.[] | {id, title, version}'

# 2. Read the full content
curl -s http://localhost:3001/api/files/phys-001 | jq '.content'
```

### Agent: Update a File

```bash
# 1. Get current file
FILE=$(curl -s http://localhost:3001/api/files/phys-001)

# 2. Modify content and submit update
curl -s -X POST http://localhost:3001/api/files/update \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "phys-001",
    "title": "Introduction to Quantum Mechanics (Updated)",
    "content": "---\nid: phys-001\ntitle: Introduction to Quantum Mechanics (Updated)\ncategory: physics\ntags: [\"quantum\", \"mechanics\"]\nlast_updated: 2026-07-11\nversion: 1.2.0\n---\n\n# Updated Content..."
  }' | jq '{id, version, last_updated}'
```
