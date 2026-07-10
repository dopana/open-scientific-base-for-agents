# Agent Integration Guide

## Overview

This guide explains how **AI agents** (LLMs, scripts, automated tools) can programmatically interact with the Open Scientific Base. The API is designed to be simple, predictable, and easy to use from any programming language or via simple HTTP calls.

## Getting Started

### Prerequisites for Agents

- **HTTP client** — Any language can make HTTP requests
- **JSON parser** — All responses are JSON
- **API URL** — The base URL exposed by the API server

### Quick Test

```bash
# Check if the API is running
curl -s http://localhost:3001/api/health

# Expected response:
# {"status":"ok","service":"open-scientific-base","version":"0.1.0"}
```

## Agent Operations

### 1. Discovering Available Knowledge

**List all files** — Find everything available:

```bash
curl -s http://localhost:3001/api/files | jq '.'
```

**List by category** — Narrow down to a specific field:

```bash
curl -s 'http://localhost:3001/api/files?category=physics' | jq '.'
```

**List categories** — See what categories exist and how many files each has:

```bash
curl -s http://localhost:3001/api/categories | jq '.'
# Output:
# [
#   { "name": "biology", "count": 2 },
#   { "name": "chemistry", "count": 1 },
#   ...
# ]
```

### 2. Searching for Knowledge

**Full-text search** — Find files by topic:

```bash
curl -s -X POST http://localhost:3001/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "quantum mechanics", "category": "physics"}' \
  | jq '.[] | {id, title, version}'
```

**Combined search with category filter**:

```bash
curl -s -X POST http://localhost:3001/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "CRISPR gene", "category": "biology"}'
```

### 3. Reading File Content

**Get full content by ID**:

```bash
# Get the complete file including markdown content
curl -s http://localhost:3001/api/files/phys-001 | jq '.title, .version, .last_updated'

# Extract just the content (strips metadata)
curl -s http://localhost:3001/api/files/phys-001 | jq -r '.content'
```

**Programmatic access (Python)**:

```python
import requests
import json

API_BASE = "http://localhost:3001"

# Search for files
response = requests.post(f"{API_BASE}/api/search", json={
    "query": "quantum computing",
    "category": "computer-science"
})
results = response.json()
for r in results:
    print(f"{r['id']}: {r['title']} (v{r['version']})")

# Read a file
response = requests.get(f"{API_BASE}/api/files/cs-001")
file_data = response.json()
content = file_data['content']
print(f"Title: {file_data['title']}")
print(f"Content length: {len(content)} chars")
```

### 4. Updating Knowledge

**Update file content** (with frontmatter validation):

```bash
curl -s -X POST http://localhost:3001/api/files/update \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "phys-001",
    "title": "Updated Title",
    "content": "---\nid: phys-001\ntitle: Updated Title\ncategory: physics\ntags: [\"quantum\", \"mechanics\"]\nlast_updated: 2026-07-11\nversion: 1.1.0\n---\n\n# Updated Content\n\nNew content here...",
    "tags": ["quantum", "mechanics", "updated"]
  }' | jq '{id, version, last_updated}'
```

**Partial update** (update only specific fields):

```bash
# Update just the title
curl -s -X POST http://localhost:3001/api/files/update \
  -H 'Content-Type: application/json' \
  -d '{"id": "phys-001", "title": "New Title Only"}' \
  | jq '{id, title}'

# Update just the tags
curl -s -X POST http://localhost:3001/api/files/update \
  -H 'Content-Type: application/json' \
  -d '{"id": "phys-001", "tags": ["new-tag-1", "new-tag-2"]}' \
  | jq '{id, tags}'
```

**Python agent example**:

```python
import requests

API_BASE = "http://localhost:3001"

# Read current file
current = requests.get(f"{API_BASE}/api/files/phys-001").json()

# Modify content (apply some transformation)
updated_content = current['content'].replace(
    "old content",
    "new improved content"
)

# Submit update
response = requests.post(f"{API_BASE}/api/files/update", json={
    "id": "phys-001",
    "title": current['title'],
    "content": updated_content,
    "tags": current['tags'] + ["updated-by-agent"]
})

if response.ok:
    updated = response.json()
    print(f"Updated: {updated['id']} → v{updated['version']}")
else:
    error = response.json()
    print(f"Error: {error['error']}")
```

## SOP Files for AI Agents

The `.agent/` directory contains **Standard Operating Procedures (SOPs)** that define how AI agents should interact with the repository:

### `.agent/read-rules.md`

This file provides instructions for **reading** from the knowledge base:

- **Preferred method**: Use the REST API for search and single-file retrieval
- **Alternative**: Direct Git access for bulk operations
- **Best practices**: Check `version` for latest revision, use `tags` for cross-referencing

### `.agent/write-rules.md`

This file provides instructions for **writing** to the knowledge base:

- **ID convention**: `{prefix}-{number}` (e.g., `phys-003`)
- **Required frontmatter fields**: `id`, `title`, `category`, `tags`, `last_updated`, `version`
- **Update protocol**: Either via API (`POST /api/files/update`) or direct Git commit
- **Content guidelines**: Structure, citations, format

## Agent Protocol

### Recommended Agent Workflow

```
1. DISCOVER
   GET /api/categories           → See what's available
   GET /api/files?category=X     → List files in a category

2. SEARCH
   POST /api/search              → Find relevant files
   { "query": "topic", "category": optional }

3. READ
   GET /api/files/{id}           → Get full content

4. ANALYZE
   Process and extract insights from the content

5. UPDATE (optional)
   POST /api/files/update        → Submit improvements
   { "id": "...", "content": "...", "tags": [...] }

6. VERIFY
   GET /api/files/{id}           → Confirm the update was applied
   Check version incremented
```

### Response Size Guidelines

| Endpoint | Typical Response Size | Notes |
|----------|---------------------|-------|
| `GET /api/files` | 2–50 KB | Depends on number of files |
| `GET /api/files/{id}` | 5–100 KB | Larger for files with extensive content |
| `POST /api/search` | 1–20 KB | Filtered by query and limit |
| `GET /api/categories` | < 1 KB | Always small |

### Error Handling for Agents

```python
def safe_api_call(url, method="GET", data=None):
    """Make an API call with proper error handling."""
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        else:
            response = requests.post(url, json=data, timeout=30)
        
        if response.status_code == 404:
            print(f"File not found: {url}")
            return None
        elif response.status_code == 400:
            error = response.json()
            print(f"Bad request: {error['error']}")
            return None
        elif response.status_code == 200:
            return response.json()
        else:
            print(f"Unexpected status {response.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"Connection failed — is the API server running?")
        return None
    except requests.exceptions.Timeout:
        print(f"Request timed out")
        return None
```

## API Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Max search results | 20 (default) | Configurable via `limit` parameter |
| File content size | Unlimited | Markdown files of any size |
| Request timeout | 30s (recommended) | For large content updates |

## Use Cases

### 1. Research Assistant Agent

An agent that helps researchers find and summarize scientific knowledge:

```python
# 1. Search for relevant topics
search_results = requests.post(f"{API_BASE}/api/search", json={
    "query": "quantum entanglement",
    "category": "physics"
}).json()

# 2. Read the top result
if search_results:
    top_file = requests.get(f"{API_BASE}/api/files/{search_results[0]['id']}").json()
    # Extract key information
    print(f"Topic: {top_file['title']}")
    print(f"Version: {top_file['version']}")
    
    # Process the content (with frontmatter stripped)
    import re
    content = re.sub(r'^---[\s\S]*?---\n*', '', top_file['content'])
    # ... summarize or extract insights
```

### 2. Content Curation Agent

An agent that maintains and improves the knowledge base:

```python
def update_file_with_new_research(file_id, new_section):
    """Add a new section to an existing knowledge file."""
    # Read current
    current = requests.get(f"{API_BASE}/api/files/{file_id}").json()
    
    # Append new content
    updated_content = current['content'] + f"\n\n## Recent Developments\n\n{new_section}\n"
    
    # Submit update
    response = requests.post(f"{API_BASE}/api/files/update", json={
        "id": file_id,
        "content": updated_content,
        "tags": current['tags'] + ["recent-developments"]
    })
    
    return response.json()
```

### 3. Cross-Reference Agent

An agent that links related concepts across categories:

```python
# Search across multiple categories for related concepts
concepts = ["quantum", "algorithm", "cryptography"]
related_files = []

for concept in concepts:
    results = requests.post(f"{API_BASE}/api/search", json={
        "query": concept
    }).json()
    related_files.extend(results)

# Deduplicate and present cross-references
seen = set()
for f in related_files:
    if f['id'] not in seen:
        seen.add(f['id'])
        print(f"{f['title']} ({f['category']}) - tags: {', '.join(f['tags'])}")
```

## Security Notes for Agents

1. **No authentication**: The API currently has no auth — deploy behind a VPN or use Cloudflare Access for production
2. **Input validation**: Always provide valid YAML frontmatter in content updates
3. **Rate limiting**: Be respectful — don't spam the API with rapid requests
4. **Content responsibility**: Ensure any content you submit is accurate and well-formatted

## Troubleshooting for Agents

### Common Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Connection refused | API server not running | Start with `cargo run` in `api/` |
| `404 Not Found` | Invalid file ID | Check ID with `GET /api/files` |
| `400 Bad Request` | Invalid frontmatter | Validate YAML before submitting |
| Empty search results | No matching terms | Try broader search terms |
| CORS error | Frontend/API on different origins | Use `VITE_API_URL` to match API location |

### Quick Diagnostics

```bash
# Check API is running
curl http://localhost:3001/api/health

# List all available files
curl http://localhost:3001/api/files | python3 -m json.tool | head -20

# Test search
curl -X POST http://localhost:3001/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"test"}' \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'{len(data)} results')"
```
