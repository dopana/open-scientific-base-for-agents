# Development Guide

## Prerequisites

| Tool | Version | Installation |
|------|---------|-------------|
| Rust | 2024 edition | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` |
| Bun | ≥1.x | `curl -fsSL https://bun.sh/install | bash` |
| Node.js | ≥22.x | via `bun` or `nvm install 22` |
| Wrangler | latest | `npm install -g wrangler` |

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd open-scientific-base-for-agents

# Install frontend dependencies
cd frontend
bun install
cd ..
```

### 2. Start the Rust API Server

```bash
cd api
cargo run
```

The API server starts on `http://0.0.0.0:3001` with:
- Health check: `http://localhost:3001/api/health`
- File listing: `http://localhost:3001/api/files`
- Auto-loads data from `data/` directory (falls back to embedded mock data)

### 3. Start the Frontend Dev Server

```bash
cd frontend
bun run dev
```

Opens at `http://localhost:3000`. The frontend auto-connects to the API at `http://localhost:3001`.

### 4. Verify Everything Works

```bash
# Check API health
curl http://localhost:3001/api/health
# → {"status":"ok","service":"open-scientific-base","version":"0.1.0"}

# List files
curl http://localhost:3001/api/files
# → [{"id":"phys-001","title":"Introduction to Quantum Mechanics",...}]

# Search
curl -X POST http://localhost:3001/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"quantum"}'
# → [...matching files...]
```

## Project Structure

```
open-scientific-base-for-agents/
├── .agent/                    # Agent SOPs (instructions for AI agents)
│   ├── read-rules.md          # How to read from the knowledge base
│   └── write-rules.md         # How to write/update knowledge
├── api/                       # Rust API (Axum web framework)
│   ├── src/
│   │   ├── main.rs            # Entrypoint, router, server bind
│   │   ├── handlers.rs        # Request handler functions
│   │   ├── models.rs          # Serde data models (request/response)
│   │   ├── mock.rs            # In-memory data store (development)
│   │   └── frontmatter.rs     # YAML frontmatter parser & validator
│   ├── Cargo.toml             # Rust dependencies
│   ├── wrangler.toml          # Cloudflare Workers config
│   └── schema.sql             # D1 database schema (production)
├── frontend/                  # React 19 SPA
│   ├── src/
│   │   ├── App.tsx            # Main app with state management
│   │   ├── App.css            # Global styles + custom scrollbars
│   │   ├── api.ts             # Typed API client
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── config.ts          # Category config & utilities
│   │   └── components/
│   │       ├── Header.tsx     # Top bar (search, branding)
│   │       ├── Sidebar.tsx    # Category navigation
│   │       ├── FileList.tsx   # File listing panel
│   │       └── FileViewer.tsx # Markdown content viewer
│   ├── package.json           # NPM dependencies & scripts
│   └── rsbuild.config.ts      # Build configuration
├── data/                      # Scientific knowledge files (MD)
│   ├── physics/
│   │   ├── quantum-mechanics.md
│   │   └── special-relativity.md
│   ├── biology/
│   │   ├── crispr-gene-editing.md
│   │   └── evolutionary-biology.md
│   ├── chemistry/
│   │   └── organic-chemistry-basics.md
│   ├── computer-science/
│   │   ├── transformer-architecture.md
│   │   └── quantum-algorithms.md
│   └── mathematics/
│       ├── linear-algebra-foundations.md
│       └── statistical-methods.md
├── .github/workflows/
│   └── sync-d1.yml            # D1 sync CI/CD pipeline
├── docs/                      # Documentation
│   ├── README.md
│   ├── architecture.md
│   ├── api-reference.md
│   ├── data-format.md
│   ├── frontend-guide.md
│   ├── deployment.md
│   ├── development.md
│   └── agent-integration.md
├── .env.example               # Frontend environment variables
└── README.md                  # Project overview
```

## Development Workflow

### Frontend Development

```bash
cd frontend

# Start dev server (hot reload on port 3000)
bun run dev

# Run linter
bun run check

# Run tests
bun run test

# Format code
bun run format

# Build for production
bun run build
```

### API Development

```bash
cd api

# Run with auto-reload (requires cargo-watch)
cargo watch -x run

# Run without auto-reload
cargo run

# Check compilation (fast)
cargo check

# Run tests
cargo test

# Build release binary
cargo build --release
```

### Mock Data Flow

During development, the API:

1. **Tries to load** files from the `data/` directory using the frontmatter parser
2. If the `data/` directory is unavailable, **falls back** to embedded mock data (compiled into the binary via `include_str!`)
3. The mock data includes 9 pre-loaded files across 5 categories

To force mock data, rename/remove the `data/` directory:

```bash
mv data data-backup
cargo run
# → "Could not load files from data/ directory, using embedded mock data"
```

### Testing Strategy

#### Rust Tests

```bash
cd api

# Run all tests
cargo test

# Run frontmatter parser tests specifically
cargo test frontmatter

# Run with output
cargo test -- --nocapture
```

The frontmatter parser includes unit tests:

| Test | Description |
|------|-------------|
| `test_parse_valid_frontmatter` | Parses valid YAML and checks all fields |
| `test_missing_delimiter` | Rejects content without `---` |
| `test_invalid_id_format` | Rejects IDs without the `{prefix}-{number}` format |
| `test_invalid_version` | Rejects non-semver version strings |
| `test_empty_tags` | Rejects empty tags array |

#### Frontend Tests

```bash
cd frontend

# Run all tests
bun run test

# Run in watch mode
bun run test:watch
```

Tests use:
- **Rstest**: Test runner built on Rsbuild
- **Testing Library**: React component testing
- **Happy DOM**: DOM environment (no browser needed)

### Code Quality

#### Rust

The Rust code follows standard conventions:
- 4-space indentation (Rust standard)
- `cargo fmt` for formatting
- `cargo clippy` for linting
- No `unsafe` code (unless absolutely necessary)

#### Frontend

The frontend uses **Biome** for both formatting and linting:

```bash
# Check and auto-fix
bun run check

# Format only
bun run format
```

Biome rules include:
- **Accessibility**: All SVGs must have `role="img"` and `<title>` or `aria-label`
- **No Array Index Keys**: Use stable, derived keys instead of indices
- **No Non-null Assertions**: Prefer type-safe patterns over `!`
- **Exhaustive Dependencies**: Verify React hook dependencies

## Adding a New Knowledge File

1. **Choose the category directory:**
   ```bash
   # e.g., for a new physics file
   touch data/physics/new-topic.md
   ```

2. **Write the file with proper YAML frontmatter:**
   ```markdown
   ---
   id: phys-003
   title: Thermodynamics
   category: physics
   tags: ["thermodynamics", "heat", "entropy", "laws-of-thermodynamics"]
   last_updated: 2026-07-11
   version: 1.0.0
   ---

   # Thermodynamics

   ## Overview

   Thermodynamics is a branch of physics that deals with...
   ```

3. **The API will automatically pick up the new file** on next restart (or you can add it to the mock data in `mock.rs` for compile-time inclusion).

## Adding a New API Endpoint

1. **Define request/response models** in `api/src/models.rs`:
   ```rust
   #[derive(Debug, Deserialize)]
   pub struct MyNewRequest {
       pub some_field: String,
   }
   ```

2. **Implement the handler** in `api/src/handlers.rs`:
   ```rust
   pub async fn my_new_handler(
       State(store): State<AppState>,
       Json(payload): Json<MyNewRequest>,
   ) -> Result<Json<SomeResponse>, AppError> {
       // Business logic
       Ok(Json(result))
   }
   ```

3. **Register the route** in `api/src/main.rs`:
   ```rust
   .route("/api/my-new-endpoint", axum::routing::post(handlers::my_new_handler))
   ```

4. **Add the client function** in `frontend/src/api.ts`:
   ```typescript
   export async function myNewEndpoint(data: MyNewRequest): Promise<SomeResponse> {
     return apiFetch<SomeResponse>('/api/my-new-endpoint', {
       method: 'POST',
       body: JSON.stringify(data),
     });
   }
   ```

## Common Development Tasks

### Update Dependencies

```bash
# Rust
cd api
cargo update

# Frontend
cd frontend
bun update
```

### Add a Rust Dependency

```bash
cd api
cargo add <crate-name>
```

### Check Rust Compilation

```bash
cd api
cargo check     # Fast compilation check (no binary output)
cargo clippy    # Lint checks
```

### Run a Specific Test

```bash
# Rust
cargo test test_parse_valid_frontmatter

# Frontend
bun run test -- --grep "test name"
```

## Debugging

### API Logging

The API uses structured logging with the `tracing` crate:

```bash
# Default: info level
cargo run

# Debug level (more verbose)
RUST_LOG=debug cargo run

# Trace level (most verbose, includes all HTTP requests)
RUST_LOG=trace cargo run
```

### Frontend Debugging

- **React DevTools**: Install the React DevTools browser extension
- **Console**: The frontend logs API errors via `console.error`
- **Network**: Check the browser's Network tab for API request details

## Environment Configuration

### Frontend (.env)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Available variables:

```env
# URL of the Rust API server
VITE_API_URL=http://localhost:3001
```

### API (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `RUST_LOG` | `info` | Log level (debug, info, warn, error, trace) |

## Code Review Checklist

When submitting a pull request:

- [ ] `cargo check` passes (no compilation errors)
- [ ] `cargo test` passes (all unit tests)
- [ ] `bun run check` passes (Biome lint)
- [ ] `bun run build` succeeds (frontend production build)
- [ ] New endpoints have corresponding frontend API client functions
- [ ] New data files have valid YAML frontmatter
- [ ] All SVGs have accessibility attributes
- [ ] No array indices used as React keys
- [ ] New Rust types use `#[serde(deny_unknown_fields)]` for strict validation
