# Frontend Enhancement Roadmap

> **Status:** Core UI Complete, enhancements planned
> **Updated:** 2026-07-11

---

## Current State

The frontend is a fully functional single-page application with:

- ✅ Search with debounce (200ms) and keyboard shortcut (Ctrl+K)
- ✅ Category filtering via sidebar
- ✅ File listing with loading, empty, and error states
- ✅ Markdown rendering (headings, code, lists, inline formatting)
- ✅ Copy-to-clipboard for file content
- ✅ Dark theme with custom scrollbars
- ✅ Accessible SVGs with `role="img"` and `<title>`
- ✅ 0 Biome lint errors, clean production build (255 kB / 81 kB gzip)

---

## Enhancement Roadmap

### Short-term (Next)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Code syntax highlighting | High | Medium | Add `highlight.js` or `shiki` for code block language highlighting |
| Mobile responsive layout | High | Medium | Collapsible sidebar, stacked panels on small screens |
| File editing UI | Medium | Large | In-browser markdown editor with live preview for agents |
| Keyboard navigation | Medium | Small | Arrow keys to navigate file list, `Escape` to close viewer |
| Dark/light theme toggle | Low | Small | CSS variable-based theme switching |

### Medium-term

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Markdown table rendering | Medium | Small | Parse and render `| table | syntax |` |
| Image embedding | Medium | Small | Render `![alt](url)` within content |
| File version history | Medium | Medium | Show version diff timeline |
| Search result highlighting | Medium | Small | Highlight matching terms in results |
| Infinite scroll / pagination | Low | Medium | For large knowledge bases (1000+ files) |

### Long-term

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| WYSIWYG editor for agents | Low | Large | Rich text editor with structured input |
| Real-time collaboration | Low | Very Large | WebSocket-based multi-agent editing |
| Knowledge graph visualization | Low | Very Large | Force-directed graph of tag relationships |
| Offline support (PWA) | Low | Large | Service worker + IndexedDB cache |
| AI chat interface | Low | Large | Built-in chat with RAG over knowledge base |

---

## Architecture Decisions for Future

### State Management
- **Current:** React `useState` + `useCallback` (simple, sufficient)
- **Consider:** Zustand or Jotai if state complexity grows
- **Avoid:** Redux (overkill for current complexity)

### Routing
- **Current:** Single root component with conditional rendering
- **Consider:** React Router if we add: file editing pages, settings, admin panels
- **Not needed:** For current SPA layout (fixed 3-panel design)

### Data Fetching
- **Current:** Custom `useEffect` + `fetch` wrapper in `api.ts`
- **Consider:** `@tanstack/react-query` for caching, deduplication, stale management
- **Benefit:** Reduces API calls, adds optimistic updates for edits

### Testing
- **Current:** Rstest + Testing Library + Happy DOM
- **Coverage target:** 80%+ for components, 100% for API client
- **Priority tests:** FileViewer markdown rendering, Search debounce, Error states

---

## Performance Budget

| Metric | Current | Target | Budget |
|--------|---------|--------|--------|
| Bundle size | 255 kB | <300 kB | ✅ Within budget |
| Gzipped | 81 kB | <100 kB | ✅ Within budget |
| First paint | <500ms | <1s | ✅ |
| Time to interactive | <1s | <2s | ✅ |
| Lighthouse score | — | >90 | ⏳ Not tested |

---

## Accessibility Targets

| Criterion | Current Status | Target |
|-----------|---------------|--------|
| SVG images | ✅ All have `role="img"` + `aria-label` + `<title>` | WCAG 2.1 AA |
| Keyboard navigation | ⚠️ Partial (search only) | Full keyboard nav |
| Focus indicators | ⚠️ Default browser only | Custom focus ring |
| Color contrast | ✅ Dark theme passes | WCAG AA (4.5:1) |
| Screen reader labels | ⚠️ Partial | Full ARIA labels |
| Reduced motion | ❌ Not implemented | `prefers-reduced-motion` media query |

---

## Monitoring & Analytics

- **Bundle analysis:** Use `bun run build --analyze` (requires `@rsbuild/plugin-webpack-bundle-analyzer`)
- **Error tracking:** Consider Sentry for production error monitoring
- **Performance:** Lighthouse CI in GitHub Actions
- **Usage analytics:** Consider Plausible (privacy-friendly) if public deployment
