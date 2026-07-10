# OSB CLI — Open Scientific Base CLI

A **Rust CLI** for AI agents (and humans) to interact with the Open Scientific Base API. Supports authentication, all API operations, and flexible output modes.

## Quick Start

```bash
# Install
cd cli && cargo build --release
alias osb='./target/release/osb'

# List files
osb files list

# Search
osb search "quantum mechanics"

# Get file content
osb files get phys-001 --content-only
```

## Installation

```bash
cd cli
cargo build --release
./target/release/osb --help
```

Or install globally:
```bash
cargo install --path cli
```

## Commands

### `files list`

List all files, optionally filtered by category.

```bash
osb files list
osb files list --category physics
osb --json files list --category biology
```

### `files get`

Get a single file by ID with full content.

```bash
osb files get phys-001
osb files get phys-001 --content-only
osb --json files get phys-001
```

### `search`

Full-text search across all files.

```bash
osb search "quantum entanglement"
osb search "CRISPR" --category biology
osb search "transformer" --limit 5
```

### `update`

Update a file's metadata and/or content.

```bash
# Update title and tags
osb update phys-001 --title "New Title" --tags "quantum,physics,updated"

# Update content from file
osb update phys-001 --content-file ./updated-content.md

# Update content inline
osb update phys-001 --content "--- id: phys-001 ..."

# Full update
osb update phys-001 \
  --title "Updated Title" \
  --content-file ./new-content.md \
  --tags "tag1,tag2,tag3"
```

### `categories`

List all categories with file counts.

```bash
osb categories
osb --json categories
```

### `health`

Check API health.

```bash
osb health
osb --json health
```

## Authentication

Set your API key via environment variable or `--api-key` flag:

```bash
export OSB_API_KEY=your-api-key-here
osb files list
```

Or pass inline:

```bash
osb --api-key sk-abc123 files list
```

The key is sent as the `x-api-key` HTTP header.

## Configuration

| Option | Env Variable | Default | Description |
|--------|-------------|---------|-------------|
| `--api-url` | `OSB_API_URL` | `http://localhost:3001` | API base URL |
| `--api-key` | `OSB_API_KEY` | — | API key for auth |
| `--json` | — | `false` | Output raw JSON |

## Output Modes

### Human Mode (default)

Colorized, formatted terminal output with icons and structure.

### JSON Mode (`--json`)

Raw JSON output for AI agent consumption — pipe directly to `jq`:

```bash
osb --json files list | jq '.[].title'
osb --json search "quantum" | jq '[.[] | {id, title, version}]'
osb --json files get phys-001 | jq -r '.content' > phys-001.md
```

## Agent Integration

For AI agents in any language, call the CLI and parse JSON output:

```bash
# Python
import subprocess
import json

result = subprocess.run(
    ["osb", "--json", "search", "quantum computing"],
    capture_output=True, text=True
)
files = json.loads(result.stdout)
for f in files:
    print(f"{f['id']}: {f['title']}")
```

```python
# Read file content
result = subprocess.run(
    ["osb", "--json", "files", "get", "phys-001"],
    capture_output=True, text=True
)
file_data = json.loads(result.stdout)
content = file_data['content']
```

```python
# Update a file
result = subprocess.run(
    ["osb", "--json", "update", "phys-001",
     "--title", "Updated Title",
     "--tags", "quantum,physics,agent-updated"],
    capture_output=True, text=True
)
updated = json.loads(result.stdout)
print(f"Version: {updated['version']}")
```
