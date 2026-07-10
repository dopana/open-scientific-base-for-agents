# Data Model Plan

> **Status:** Implemented in `models.rs` and `schema.sql`
> **Updated:** 2026-07-11

## Design Philosophy

The data model follows three core principles:

1. **Git is the source of truth** — Markdown files in `data/` are the canonical storage; D1 is a query-optimized cache
2. **Strict schemas for agents** — Every field is validated at the API boundary to reject malformed agent submissions
3. **Versioned content** — Every update increments the version, enabling audit trails and conflict resolution

## Entity Relationship

```
┌──────────────────────────────────────────┐
│               FileEntry                    │
│──────────────────────────────────────────│
│ id:          TEXT PRIMARY KEY             │
│ path:        TEXT NOT NULL                │
│ title:       TEXT NOT NULL                │
│ category:    TEXT NOT NULL                │
│ tags:        TEXT NOT NULL (JSON array)   │
│ content:     TEXT NOT NULL                │
│ content_html:TEXT (optional)              │
│ version:     TEXT NOT NULL (semver)       │
│ last_updated:TEXT NOT NULL (ISO date)     │
│ created_at:  TEXT NOT NULL (ISO date)     │
└─────────────────────┬────────────────────┘
                      │ 1:1
                      ▼
┌──────────────────────────────────────────┐
│              files_fts (FTS5)              │
│──────────────────────────────────────────│
│ id:          UNINDEXED                    │
│ title:       FULLTEXT                     │
│ content:     FULLTEXT                     │
└──────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Single Table vs. Normalized Schema

**Decision:** Single `files` table (no separate `categories` or `tags` tables)

**Rationale:**
- D1 is a per-worker SQLite instance — join performance is not a concern at this scale
- Simplifies writes (single UPSERT instead of multiple table operations)
- `tags` stored as JSON text — parsed in application code when needed
- `category` is denormalized — derived from directory structure, validated at load time

### 2. FTS5 for Search

**Decision:** SQLite FTS5 virtual table with sync triggers

**Rationale:**
- Built into SQLite — no external search service needed
- Porter stemmer handles English word variations ("quantum" → "quantum", "computing" → "comput")
- `unicode61` tokenizer handles international characters (Schrödinger, Gödel)
- Content-sync triggers keep the FTS index perfectly in sync with the main table
- Ranked results with BM25 scoring (FTS5 default)

### 3. Tags as JSON String vs. Normalized Table

**Decision:** Tags stored as JSON array string (`tags TEXT`)

**Rationale:**
- Avoids a join table for a simple list of strings
- Easy to serialize/deserialize with Serde
- FTS5 search covers tags since content is full-text indexed
- If tag-based filtering becomes a bottleneck, add `LIKE '%"tag-name"%'` queries

### 4. Versioning Strategy

**Decision:** Semantic versioning (MAJOR.MINOR.PATCH), auto-incremented on update

**Rationale:**
- Follows semver conventions familiar to developers
- Auto-increment on patch ensures every change gets a new version
- Agents can use `version` to check if their cached knowledge is stale
- Future: Use version for conflict detection in git sync

### 5. Content Storage

**Decision:** Full markdown including YAML frontmatter stored in `content` field

**Rationale:**
- Single source of truth — no need to reconstruct frontmatter from DB fields
- D1 can handle multiple KB per row (SQLite max is 1GB per row)
- Frontmatter is stripped for display by the frontend viewer
- Full content returned to agents via API for programmatic processing

## Rust Models vs. D1 Schema

| Rust Field | D1 Column | Type Mapping | Notes |
|-----------|-----------|-------------|-------|
| `id: String` | `id TEXT` | `VARCHAR → TEXT` | Primary key |
| `path: String` | `path TEXT` | `VARCHAR → TEXT` | Not null |
| `title: String` | `title TEXT` | `VARCHAR → TEXT` | Not null |
| `category: String` | `category TEXT` | `VARCHAR → TEXT` | Indexed |
| `tags: Vec<String>` | `tags TEXT` | `JSON Array → TEXT` | Serialized in Rust |
| `content: String` | `content TEXT` | `TEXT → TEXT` | Full markdown |
| — | `content_html TEXT` | — | Optional pre-rendered |
| `version: String` | `version TEXT` | `VARCHAR → TEXT` | Default '1.0.0' |
| `last_updated: String` | `last_updated TEXT` | `ISO Date → TEXT` | Default `datetime('now')` |
| — | `created_at TEXT` | — | Only in D1 |

## Frontend Types

The TypeScript interfaces in `types.ts` mirror the Rust models:

| Frontend Interface | Rust Model | Fields |
|-------------------|-----------|--------|
| `FileEntry` | `FileEntry` | `id`, `path`, `title`, `category`, `tags`, `content`, `version`, `last_updated` |
| `FileSummary` | `FileSummary` | Same minus `content` |
| `CategoryInfo` | `CategoryInfo` | `name`, `count` |
| `SearchQuery` | `SearchQuery` | `query`, `category?`, `limit?` |
| `UpdateRequest` | `UpdateRequest` | `id`, `title?`, `content?`, `tags?` |

## Future Considerations

### Planned Extensions

| Extension | Reason | Status |
|-----------|--------|--------|
| `content_html` field | Pre-render markdown to HTML on write for faster reads | 📋 Planned |
| `file_size` column | Track content size for analytics | 📋 Planned |
| `checksum` column | SHA-256 of content for integrity verification | 📋 Planned |
| `author` / `agent_id` | Track which agent modified the file | 📋 Planned |
| `change_log` table | Full audit trail of all modifications | 📋 Planned |
| `references` table | Cross-file citation graph | 📋 Planned |

### Performance Considerations

- **Current size:** ~9 files, each <10KB → Fits in a single SQLite page
- **Scaling:** D1 handles up to 1GB per database → ~100,000 files at 10KB each
- **Query patterns:** Reads >> Writes (optimized for search and retrieval)
- **Index strategy:** `category` index for filtered listing, FTS5 for search
