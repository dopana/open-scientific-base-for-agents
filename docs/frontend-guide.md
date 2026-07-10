# Frontend Guide

## Overview

The frontend is a **single-page application (SPA)** built with React 19, TypeScript 6, and Tailwind CSS 4. It provides a dark-themed, responsive UI for browsing, searching, and viewing scientific knowledge files.

## Tech Stack

| Dependency | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework with concurrent rendering |
| React DOM | 19.x | DOM rendering |
| Rsbuild | 2.x | Fast Rust-based bundler (replaces webpack) |
| `@rsbuild/plugin-react` | 2.x | React compiler & JSX support |
| `@rsbuild/plugin-tailwindcss` | 2.x | Tailwind CSS integration |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| TypeScript | 6.x | Type safety |
| Biome | 2.x | Linting & formatting |
| Rstest | 0.10 | Testing framework |
| Testing Library | 10.x/16.x | React testing utilities |

## Project Structure

```
frontend/src/
├── index.tsx                  # Entry point — mounts React to #root
├── App.tsx                    # Main component — state & layout
├── App.css                    # Global styles & scrollbar customization
├── api.ts                     # API client — all HTTP calls
├── types.ts                   # TypeScript interfaces (mirrors Rust models)
├── config.ts                  # Category config, date formatting utilities
└── components/
    ├── Header.tsx             # Top bar: logo, search, file count
    ├── Sidebar.tsx            # Left panel: category navigation
    ├── FileList.tsx           # Center panel: file listing
    └── FileViewer.tsx         # Right panel: markdown content viewer
```

## Component Architecture

### `App` (Root Component)

The main application component manages all application state:

```typescript
// State managed by App
const [files, setFiles] = useState<FileSummary[]>([]);
const [categories, setCategories] = useState<CategoryInfo[]>([]);
const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [selectedId, setSelectedId] = useState<string | null>(null);
const [searchQuery, setSearchQuery] = useState('');
```

**Key behaviors:**
- Loads categories on mount via `listCategories()`
- Debounced search (200ms) — triggers API call on query or category change
- Resets file selection when search or category changes

### `Header`

The top navigation bar with:

- **Logo**: Gradient icon with the "Scientific Base" title
- **Search Bar**: Full-width search with:
  - `Ctrl+K` / `Cmd+K` keyboard shortcut to focus
  - Focus ring animation
  - Placeholder hint text
- **File Counter**: Shows total file count

```typescript
interface HeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  totalFiles: number;
}
```

### `Sidebar`

Left navigation panel for category filtering:

- **"All Files"** button — resets category filter (always visible)
- **Category buttons** — one per scientific category with:
  - Emoji icon (from `config.ts`)
  - Category label
  - File count badge
  - Disabled state for empty categories
  - Active state highlighting
- **Connection Status** — bottom section with green pulsating dot

```typescript
interface SidebarProps {
  categories: CategoryInfo[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}
```

### `FileList`

File listing panel with multiple states:

**Loading State:**
```tsx
<div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
<p className="text-sm text-slate-500">Loading files...</p>
```

**Empty State:**
```tsx
<div className="text-4xl mb-3">🔍</div>
<p className="text-slate-300 font-medium">No files found</p>
<p className="text-sm text-slate-500 mt-1">Try a different search term...</p>
```

**File Items:**
Each item shows:
- File title (truncated)
- Category icon + label
- Version number
- Last updated date
- Tags (up to 4, with overflow indicator `+N`)
- Selection highlight with left border accent
- Chevron icon on hover

```typescript
interface FileListProps {
  files: FileSummary[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  loading: boolean;
}
```

### `FileViewer`

Markdown content viewer with:

**Loading State:** Spinner with "Loading content..." text.

**Empty State (no file selected):** Book emoji with "Select a file" message.

**File View:**
- **File Header Section:**
  - Category badge with emoji
  - File ID (monospace)
  - Title (H1)
  - Copy button (copies markdown content to clipboard with feedback)
  - Metadata row: version, last updated, file path
  - Tags with `#` prefix and colored styling
- **Content Section:**
  - Full Markdown rendering with support for:
    - H1, H2, H3 headings
    - Paragraphs
    - Inline bold (`**bold**`)
    - Inline code (`` `code` ``)
    - Links (`[text](url)`)
    - Code blocks (```` ``` ````)
    - Unordered and ordered lists
    - Blockquotes
    - Horizontal rules
  - Scrolls to top on file change
  - Custom scrollbar styling

```typescript
interface FileViewerProps {
  file: FileEntry | null;
  loading: boolean;
}
```

## Markdown Rendering

The viewer implements a **custom Markdown parser** (`parseMarkdown` function in `FileViewer.tsx`) that converts markdown text to typed block objects, then renders them as React components:

```typescript
type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'empty' };
```

For **inline formatting**, tokens are parsed into typed objects and rendered as React elements directly (no `dangerouslySetInnerHTML`):

```typescript
type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };
```

## API Client (`api.ts`)

The API client module provides typed fetch wrappers for all backend endpoints:

| Function | Endpoint | Returns |
|----------|----------|---------|
| `listFiles(category?)` | `GET /api/files` | `Promise<FileSummary[]>` |
| `getFile(id)` | `GET /api/files/{id}` | `Promise<FileEntry>` |
| `searchFiles(query)` | `POST /api/search` | `Promise<FileSummary[]>` |
| `listCategories()` | `GET /api/categories` | `Promise<CategoryInfo[]>` |
| `healthCheck()` | `GET /api/health` | `Promise<HealthResponse>` |

The API base URL is configured via `VITE_API_URL` environment variable (defaults to `http://localhost:3001`).

## TypeScript Types (`types.ts`)

All frontend types mirror the Rust backend models:

| Interface | Matches Rust Struct | Key Fields |
|-----------|-------------------|------------|
| `FileEntry` | `FileEntry` | `id`, `path`, `title`, `category`, `tags`, `content`, `version`, `last_updated` |
| `FileSummary` | `FileSummary` | Same as `FileEntry` **without** `content` |
| `CategoryInfo` | `CategoryInfo` | `name`, `count` |
| `SearchQuery` | `SearchQuery` | `query`, `category?`, `limit?` |
| `UpdateRequest` | `UpdateRequest` | `id`, `title?`, `content?`, `tags?` |
| `CategoryConfig` | *(frontend only)* | `key`, `label`, `icon`, `color` |

## Configuration (`config.ts`)

Central configuration file for category display settings:

```typescript
export const CATEGORIES: CategoryConfig[] = [
  { key: 'physics', label: 'Physics', icon: '⚛️', color: 'from-blue-500 to-cyan-400' },
  { key: 'biology', label: 'Biology', icon: '🧬', color: 'from-emerald-500 to-teal-400' },
  { key: 'chemistry', label: 'Chemistry', icon: '🧪', color: 'from-purple-500 to-pink-400' },
  { key: 'computer-science', label: 'Computer Science', icon: '💻', color: 'from-orange-500 to-amber-400' },
  { key: 'mathematics', label: 'Mathematics', icon: '📐', color: 'from-red-500 to-rose-400' },
];
```

Utility functions:
- `CATEGORY_MAP`: `Map<string, CategoryConfig>` for O(1) lookup
- `formatDate(dateStr)`: Formats ISO dates to "Jul 11, 2026" format
- `stripFrontmatter(content)`: Removes YAML frontmatter from markdown

## Styling

### Theme

The UI uses a **dark theme** with a custom color palette:

| Token | HEX | Usage |
|-------|-----|-------|
| `slate-950` | `#020617` | Page background |
| `slate-900` | `#0f172a` | Card/surface backgrounds |
| `slate-800` | `#1e293b` | Borders, muted surfaces |
| `slate-400` | `#94a3b8` | Secondary text |
| `slate-200` | `#e2e8f0` | Primary text |
| `white` | `#ffffff` | Headings |
| `indigo-400` | `#818cf8` | Accent, active states |
| `indigo-500` | `#6366f1` | Logo gradient, focus rings |
| `emerald-500` | `#10b981` | Connection status indicator |

### Custom Scrollbars

```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.3); border-radius: 3px; }
* { scrollbar-width: thin; scrollbar-color: rgba(100, 116, 139, 0.3) transparent; }
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `rsbuild --open` | Start development server (port 3000) |
| `build` | `rsbuild build` | Production build to `dist/` |
| `preview` | `rsbuild preview` | Preview production build |
| `check` | `biome check --write` | Lint and fix |
| `format` | `biome format --write` | Format code |
| `lint` | `rslint` | Run Rslint |
| `test` | `rstest` | Run tests |
| `test:watch` | `rstest --watch` | Run tests in watch mode |

## Adding a New Category

To add a new scientific category (e.g., "Neuroscience"):

1. **Create the data directory:**
   ```bash
   mkdir -p data/neuroscience
   ```

2. **Add frontend configuration** in `frontend/src/config.ts`:
   ```typescript
   { key: 'neuroscience', label: 'Neuroscience', icon: '🧠', color: 'from-pink-500 to-rose-400' },
   ```

3. **Create files** with proper frontmatter:
   ```markdown
   ---
   id: neuro-001
   title: Neural Plasticity
   category: neuroscience
   tags: ["neural-plasticity", "brain", "synapses"]
   last_updated: 2026-07-11
   version: 1.0.0
   ---
   ```

4. The Rust API automatically discovers the new directory and its files at startup.
