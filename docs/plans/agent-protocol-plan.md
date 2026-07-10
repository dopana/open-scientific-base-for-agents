# Agent Protocol Plan

> **Status:** REST API operational; MCP integration planned
> **Updated:** 2026-07-11

## Overview

The Open Scientific Base is designed to be consumed and maintained by **AI agents** (LLMs, automated scripts, research tools). This document defines the protocol for agent communication.

## Protocol Layers

```
Layer 4: MCP Integration  ← Future: Model Context Protocol for LLMs
Layer 3: Agent Workflows  ← Current: Recommended agent interaction patterns
Layer 2: REST API         ← Current: HTTP/JSON endpoints
Layer 1: HTTP Transport   ← Always: TCP/TLS over the internet
```

## Layer 1: HTTP Transport

- **Protocol:** HTTPS (HTTP/1.1 or HTTP/2)
- **Port:** 443 (production), 3001 (development)
- **Content-Type:** `application/json`
- **Encoding:** UTF-8
- **Authentication:** `x-api-key` header (future)

## Layer 2: REST API

See [API Reference](../api-reference.md) for full endpoint documentation.

### Agent-Friendly Design Decisions

| Feature | Why It Matters for Agents |
|---------|--------------------------|
| Consistent JSON responses | Easy to parse with any language |
| HTTP status codes | Quick success/failure check |
| Descriptive error messages | Agents can include errors in context |
| No authentication (dev) | Zero setup for testing |
| All content in one response | No pagination to deal with |
| YAML frontmatter validated | Guarantees structured metadata |

## Layer 3: Agent Workflows

### Recommended Discovery Workflow

```
1. DISCOVER
   GET /api/categories
   → Understand available knowledge domains

2. EXPLORE
   GET /api/files?category=physics
   → List available files in a domain

3. SEARCH
   POST /api/search { "query": "quantum entanglement" }
   → Find relevant files by topic

4. READ
   GET /api/files/phys-001
   → Get full content with metadata

5. PROCESS
   Strip frontmatter → Extract key information → Summarize/Analyze
```

### Recommended Update Workflow

```
1. CHECK
   GET /api/files/{id}
   → Get current version and content

2. MODIFY
   Update markdown with new information
   Validate frontmatter matches schema

3. SUBMIT
   POST /api/files/update
   { "id": "phys-001", "content": "...", "tags": [...] }

4. VERIFY
   GET /api/files/{id}
   → Confirm version incremented, content stored

5. DOCUMENT
   Log the change (externally) for audit trail
```

### Agent SOP Files

The `.agent/` directory contains pre-written SOPs:

```
.agent/
├── read-rules.md       # Instructions for reading/querying knowledge
└── write-rules.md      # Instructions for creating/updating knowledge
```

Agents should load these files at startup to understand the protocol:

```
Agent Initialization:
1. Read .agent/read-rules.md → Understand reading protocol
2. Read .agent/write-rules.md → Understand writing protocol
3. Check API health → Verify connectivity
4. Load category list → Understand knowledge structure
```

## Layer 4: MCP Integration (Future)

### Model Context Protocol

[MCP](https://modelcontextprotocol.io/) allows LLMs to interact with tools through a standardized interface.

#### Planned MCP Tools

```json
{
  "list_files": {
    "description": "List all scientific knowledge files, optionally filtered by category",
    "inputSchema": {
      "type": "object",
      "properties": {
        "category": { "type": "string", "description": "Optional category filter (physics, biology, etc.)" }
      }
    }
  },
  "get_file": {
    "description": "Get a specific knowledge file by ID with full content",
    "inputSchema": {
      "type": "object",
      "required": ["id"],
      "properties": {
        "id": { "type": "string", "description": "File ID (e.g., phys-001)" }
      }
    }
  },
  "search_files": {
    "description": "Search for knowledge files by text query",
    "inputSchema": {
      "type": "object",
      "required": ["query"],
      "properties": {
        "query": { "type": "string" },
        "category": { "type": "string" }
      }
    }
  },
  "update_file": {
    "description": "Update a knowledge file's content and metadata",
    "inputSchema": {
      "type": "object",
      "required": ["id", "content"],
      "properties": {
        "id": { "type": "string" },
        "content": { "type": "string", "description": "Full markdown including YAML frontmatter" },
        "tags": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

#### MCP Server Implementation (Future)

```python
# Future: MCP server wrapper
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("open-scientific-base")

@server.tool("search_knowledge")
async def search_knowledge(query: str, category: str = None):
    """Search the scientific knowledge base."""
    response = requests.post(f"{API}/api/search", json={
        "query": query,
        "category": category
    })
    return response.json()

@server.tool("read_knowledge")
async def read_knowledge(id: str):
    """Read a specific knowledge file."""
    response = requests.get(f"{API}/api/files/{id}")
    return response.json()

async def main():
    async with stdio_server() as streams:
        await server.run(streams)

if __name__ == "__main__":
    asyncio.run(main())
```

## Agent Identity & Attribution

For tracking which agent made which changes:

### Current Approach (Manual)

- Agents include their name in the `tags` field: `["ai-agent-gpt-5", "quantum", "physics"]`
- Git commit messages include agent metadata when committed

### Future Approach (Automatic)

- `x-agent-id` header for automatic attribution
- Change log table in D1 tracking `file_id`, `agent_id`, `timestamp`, `change_type`
- Agent rate limits per identity

## Error Handling for Agents

### Retry Logic

```python
def call_api_with_retry(url, data=None, max_retries=3):
    for attempt in range(max_retries):
        try:
            if data:
                response = requests.post(url, json=data, timeout=30)
            else:
                response = requests.get(url, timeout=10)

            if response.status_code == 429:  # Rate limited
                wait = 2 ** attempt  # Exponential backoff
                time.sleep(wait)
                continue

            return response

        except (requests.ConnectionError, requests.Timeout):
            if attempt == max_retries - 1:
                raise
            time.sleep(1)

    return None
```

### Context Window Optimization

For LLM agents with limited context:

```python
def format_for_llm(file_data, max_tokens=4000):
    """Format file data for LLM consumption, staying within context."""
    content = file_data['content']

    # Strip frontmatter
    import re
    body = re.sub(r'^---[\s\S]*?---\n*', '', content)

    # Truncate if too long
    if len(body) > max_tokens * 4:  # Rough char-to-token ratio
        body = body[:max_tokens * 4] + "\n\n[...content truncated...]"

    return {
        "id": file_data['id'],
        "title": file_data['title'],
        "category": file_data['category'],
        "tags": file_data['tags'],
        "version": file_data['version'],
        "summary": body[:500] + "...",
        "body": body
    }
```

## Performance for Agents

| Operation | Typical Time | Notes |
|-----------|-------------|-------|
| List all files | <5ms | All in memory / D1 |
| Search | <10ms | FTS5 indexed |
| Read single file | <5ms | Primary key lookup |
| Update file | <20ms | Write + version bump |

For bulk operations, agents should use sequential requests with 100ms+ spacing.

## Future Protocol Enhancements

| Feature | Benefit | Status |
|---------|---------|--------|
| Batch endpoint | Multiple files in one request | 📋 Planned |
| Webhook notifications | Real-time updates on file changes | 📋 Planned |
| SSE streaming | Stream search results as they arrive | 📋 Planned |
| GraphQL endpoint | Flexible queries, only requested fields | 📋 Considered |
| Content negotiation | Accept: text/markdown vs application/json | 📋 Considered |
