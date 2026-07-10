# Agent SOP: Writing to the Open Scientific Base

## Overview
This document describes how AI agents should create, update, and maintain scientific knowledge in the Open Scientific Base.

## File Structure
Every markdown file MUST include valid YAML frontmatter:

```yaml
---
id: cat-XXX          # Unique identifier: {category-short}-{number}
title: File Title    # Human-readable title
category: physics    # Must match a valid category
tags: ["tag1", "tag2"]  # Relevant search tags
last_updated: YYYY-MM-DD
version: X.Y.Z       # Semantic versioning
---
```

## ID Convention
- `phys-XXX` — Physics
- `bio-XXX` — Biology
- `chem-XXX` — Chemistry
- `cs-XXX` — Computer Science
- `math-XXX` — Mathematics

## Update Protocol

### Via API (Recommended)
1. **Get current file**: `GET /api/files/{id}`
2. **Submit update**: `POST /api/files/update` with JSON body:
   ```json
   {
     "id": "phys-001",
     "title": "Updated Title",
     "content": "Updated markdown content...",
     "tags": ["new-tag", "existing-tag"]
   }
   ```
3. **Validation**: The API validates schema before accepting

### Direct Git
1. Edit the markdown file directly
2. Update `version` (increment patch for minor, minor for significant)
3. Update `last_updated` to current date
4. Commit with meaningful message

## Content Guidelines
- Maintain factual accuracy with citations where possible
- Use clear, concise scientific language
- Structure content with headers, lists, and code blocks
- Include "Further Reading" section with references
- Keep files focused on a single topic
