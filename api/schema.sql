-- ============================================================
-- Cloudflare D1 Schema: Open Scientific Base
-- Deploy with: npx wrangler d1 execute scientific-base --file=schema.sql
-- ============================================================

-- Core files table: stores metadata + full content
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL,              -- JSON array serialized as text
    content TEXT NOT NULL,           -- Full markdown content
    content_html TEXT,               -- Optional pre-rendered HTML
    version TEXT NOT NULL DEFAULT '1.0.0',
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Full-Text Search virtual table (FTS5)
-- Powers the /api/search endpoint for AI agents
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
    id UNINDEXED,
    title,
    content,
    content='files',
    tokenize='porter unicode61'
);

-- Sync triggers: keep FTS index in sync with files table
CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
    INSERT INTO files_fts(id, title, content)
    VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
    INSERT INTO files_fts(files_fts, id, title, content)
    VALUES ('delete', old.id, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
    INSERT INTO files_fts(files_fts, id, title, content)
    VALUES ('delete', old.id, old.title, old.content);
    INSERT INTO files_fts(id, title, content)
    VALUES (new.id, new.title, new.content);
END;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_last_updated ON files(last_updated DESC);

-- ============================================================
-- Usage Examples:
-- ============================================================

-- Search across title and content:
-- SELECT id, title, path, rank
-- FROM files_fts
-- WHERE files_fts MATCH 'quantum computing'
-- ORDER BY rank
-- LIMIT 20;

-- List files by category:
-- SELECT id, title, path, tags, version
-- FROM files
-- WHERE category = 'physics'
-- ORDER BY title;

-- Get single file content:
-- SELECT * FROM files WHERE id = 'phys-001';
