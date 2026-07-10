# Testing Strategy

> **Status:** Partially implemented (Rust unit tests exist, frontend tests scaffolded)
> **Updated:** 2026-07-11

## Testing Philosophy

1. **Test at the boundary** — Test the API through its HTTP interface, not internal functions
2. **Frontmatter parsing first** — The most critical validation path needs highest coverage
3. **Snapshot markdown rendering** — Ensure visual fidelity of rendered content
4. **Smoke test the full stack** — End-to-end flow: API → store → frontend display

## Test Pyramid

```
         ╱─────╲
        ╱  E2E  ╲          ← Phase 7: Full stack integration
       ╱─────────╲
      ╱  Integration ╲      ← Phase 6: API + D1 integration tests
     ╱─────────────────╲
    ╱    Unit Tests      ╲   ← Phase 3: Frontmatter parser, utils
   ╱────────────────────────╲
  ╱   Static Analysis         ╲  ← Always: Rust clippy, Biome, TypeScript
 ╱──────────────────────────────╲
```

## Test Categories

### 1. Static Analysis — Always On

| Tool | Scope | Command |
|------|-------|---------|
| Rust Clippy | Rust code | `cargo clippy` |
| Rust Format | Rust code | `cargo fmt --check` |
| Biome | Frontend code | `bun run check` |
| TypeScript | Type checking | `tsc --noEmit` |

**Gate:** Must pass before any PR merge.

### 2. Unit Tests — Phase 3 (Implementing)

#### Rust — Frontmatter Parser (`cargo test frontmatter`)

| Test | What It Verifies | Status |
|------|-----------------|--------|
| `test_parse_valid_frontmatter` | Correct parsing of all 6 frontmatter fields | ✅ Done |
| `test_missing_delimiter` | Rejects content without `---` | ✅ Done |
| `test_invalid_id_format` | Rejects non-`{prefix}-{number}` IDs | ✅ Done |
| `test_invalid_version` | Rejects non-semver versions | ✅ Done |
| `test_empty_tags` | Rejects empty tags arrays | ✅ Done |

**Target:** 90%+ coverage on `frontmatter.rs`

#### Rust — Data Store (`cargo test mock`)

| Test | What It Verifies | Status |
|------|-----------------|--------|
| `test_list_all_files` | Returns all files without filter | 📋 Planned |
| `test_list_by_category` | Returns only matching category | 📋 Planned |
| `test_search_basic` | Basic term matching | 📋 Planned |
| `test_search_case_insensitive` | Case insensitive matching | 📋 Planned |
| `test_search_category_filter` | Combined search + filter | 📋 Planned |
| `test_update_content` | Update changes content | 📋 Planned |
| `test_update_version_increment` | Version bumps on update | 📋 Planned |
| `test_update_unknown_id` | Returns error for missing ID | 📋 Planned |

#### Frontend — Utilities (`bun run test`)

| Test | What It Verifies | Status |
|------|-----------------|--------|
| `formatDate formats correctly` | Valid date string formatting | 📋 Planned |
| `formatDate handles invalid dates` | Graceful fallback for bad input | 📋 Planned |
| `stripFrontmatter removes YAML` | Correctly strips `---` blocks | 📋 Planned |
| `stripFrontmatter passes through plain MD` | No-op for files without frontmatter | 📋 Planned |

### 3. Component Tests — Phase 5 (Planned)

#### FileViewer Markdown Rendering

| Test | What It Verifies | Status |
|------|-----------------|--------|
| Renders H1/H2/H3 with correct styles | Heading hierarchy | 📋 Planned |
| Renders code blocks with monospace font | Code block styling | 📋 Planned |
| Renders bold text with `<strong>` | Inline bold parsing | 📋 Planned |
| Renders inline code with styled `<code>` | Inline code formatting | 📋 Planned |
| Renders links with correct `href` | Link parsing | 📋 Planned |
| Renders ordered and unordered lists | List structure | 📋 Planned |
| Renders blockquotes with italic styling | Blockquote formatting | 📋 Planned |
| Handles empty content gracefully | Empty state display | 📋 Planned |

#### FileList Component

| Test | What It Verifies | Status |
|------|-----------------|--------|
| Shows loading spinner when `loading=true` | Loading state | 📋 Planned |
| Shows empty state when files=[] | Empty state | 📋 Planned |
| Shows error banner when error prop set | Error state | 📋 Planned |
| Calls onSelectFile on click | File selection | 📋 Planned |
| Highlights selected file | Active state styling | 📋 Planned |

#### Search & Filtering

| Test | What It Verifies | Status |
|------|-----------------|--------|
| Debounce delays API call by 200ms | Performance optimization | 📋 Planned |
| Category filter resets file selection | State management | 📋 Planned |
| Keyboard shortcut (Ctrl+K) focuses search | UX shortcut | 📋 Planned |

### 4. Integration Tests — Phase 6 (Planned)

#### API Integration

| Test | What It Verifies | Status |
|------|-----------------|--------|
| `GET /api/health` returns 200 | Server is alive | 📋 Planned |
| `GET /api/files` returns JSON array | Endpoint works | 📋 Planned |
| `GET /api/files?category=physics` filters correctly | Query parameter handling | 📋 Planned |
| `GET /api/files/phys-001` returns full file | File retrieval works | 📋 Planned |
| `GET /api/files/invalid` returns 404 | Error handling works | 📋 Planned |
| `POST /api/search` returns matching results | Search works | 📋 Planned |
| `POST /api/search` with empty query returns 400 | Validation works | 📋 Planned |
| `POST /api/files/update` with valid data succeeds | Update works | 📋 Planned |
| `POST /api/files/update` with invalid frontmatter fails | Frontmatter validation | 📋 Planned |
| `GET /api/categories` returns count data | Category endpoint works | 📋 Planned |

### 5. End-to-End Tests — Phase 7 (Planned)

| Scenario | What It Verifies | Status |
|----------|-----------------|--------|
| Browse → Search → Read → Update → Verify | Full agent workflow | 📋 Planned |
| Load frontend without API server running | Graceful error display | 📋 Planned |
| Simultaneous agent updates | Concurrency handling | 📋 Planned |
| Large file (100KB+) retrieval | Performance under load | 📋 Planned |

## Test Infrastructure

### Rust Testing

```bash
# Run all tests
cargo test

# Run specific module tests
cargo test frontmatter     # Frontmatter parser tests
cargo test mock            # Data store tests
cargo test handlers        # Request handler tests

# Run with output
cargo test -- --nocapture

# Run with coverage (requires tarpaulin)
cargo tarpaulin --ignore-tests
```

### Frontend Testing

```bash
# Run all tests
cd frontend && bun run test

# Watch mode
bun run test:watch

# Run specific test file
bun run test -- --grep "FileViewer"

# Coverage (requires configuration)
bun run test -- --coverage
```

### Integration Testing (Future)

```bash
# Start API in test mode
cd api && cargo run &
API_PID=$!

# Run integration tests
cd tests && bun run test:integration

# Cleanup
kill $API_PID
```

## Coverage Targets

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| `frontmatter.rs` | ~50% (5 tests) | 90%+ | High |
| `mock.rs` | 0% | 80%+ | Medium |
| `handlers.rs` | 0% | 90%+ | Medium |
| `models.rs` | 0% (Serde derives) | 100% (compile-time) | High |
| API client (`api.ts`) | 0% | 90%+ | Medium |
| FileViewer component | 0% | 85%+ | Medium |
| FileList component | 0% | 80%+ | Medium |
| Utility functions | 0% | 100% | Medium |

## CI Integration

```yaml
# Future GitHub Actions workflow for testing
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd api && cargo test
      - run: cd frontend && bun install && bun run test
      - run: cd frontend && bun run check
```
