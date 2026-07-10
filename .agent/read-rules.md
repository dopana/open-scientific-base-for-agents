# Agent SOP: Reading from the Open Scientific Base

## Overview
This document describes how AI agents should read and retrieve knowledge from the Open Scientific Base repository.

## Data Structure
- All scientific knowledge is stored as Markdown files in the `data/` directory
- Each file contains YAML frontmatter with metadata (id, title, category, tags, version)
- Files are organized by scientific category (physics, biology, chemistry, etc.)

## Reading Protocol

### Via API (Recommended)
1. **List files**: `GET /api/files` — Returns all files with metadata summaries
2. **Filter by category**: `GET /api/files?category=physics` — Returns files in a category
3. **Search**: `POST /api/search` — Full-text search across all files
4. **Get file content**: `GET /api/files/{id}` — Returns full file with content

### Direct Git Access
1. Files are at `data/{category}/{filename}.md`
2. Parse YAML frontmatter (between `---` markers) for metadata
3. Content after frontmatter is the scientific knowledge body

## Best Practices
- Always check `version` field for the latest revision
- Use `tags` for cross-referencing related concepts
- Respect `last_updated` for time-sensitive information
- Prefer API calls for search; use direct Git access for bulk operations
