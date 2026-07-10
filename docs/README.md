# Open Scientific Base Documentation

> A structured knowledge repository for AI agents, powered by Markdown, Rust, and Cloudflare Edge Computing.

## Overview

The Open Scientific Base is a curated knowledge repository of scientific content designed to be consumed and maintained by both humans and AI agents. It provides a **RESTful API**, a **React-based UI**, and a **strict data specification** for storing, searching, and updating scientific knowledge files.

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [**Architecture**](architecture.md) | System design, component architecture, data flow, and deployment topology |
| [**API Reference**](api-reference.md) | Full REST API documentation with request/response schemas and examples |
| [**Data Format**](data-format.md) | YAML frontmatter specification, ID conventions, and validation rules |
| [**Frontend Guide**](frontend-guide.md) | React component architecture, state management, and UI customization |
| [**Deployment Guide**](deployment.md) | Cloudflare Workers deployment, D1 database setup, and CI/CD pipeline |
| [**Development Guide**](development.md) | Local setup, tooling, testing, and contribution workflow |
| [**Agent Integration**](agent-integration.md) | How AI agents read, search, and update the knowledge base programmatically |

---

## Quick Links

- **Project Repository**: `open-scientific-base-for-agents/`
- **API Server**: Rust/Axum on port `3001` (local) or Cloudflare Workers (production)
- **Frontend**: React 19 + Rsbuild on port `3000` (dev)
- **Data Store**: Cloudflare D1 (production) / In-memory SQLite (development)
- **Knowledge Files**: `data/` directory with Markdown + YAML frontmatter

## Directory Map

```
open-scientific-base-for-agents/
├── .agent/                         # Agent SOPs (read/write rules)
│   ├── read-rules.md               # How agents read from the base
│   └── write-rules.md              # How agents write to the base
├── api/                            # Rust API server
│   ├── src/
│   │   ├── main.rs                 # Entrypoint & router
│   │   ├── handlers.rs             # Request handlers
│   │   ├── models.rs               # Serde data models
│   │   ├── mock.rs                 # In-memory data store
│   │   └── frontmatter.rs          # YAML frontmatter parser
│   ├── Cargo.toml                  # Rust dependencies
│   ├── wrangler.toml               # Cloudflare Workers config
│   └── schema.sql                  # D1 database schema
├── frontend/                       # React 19 UI
│   ├── src/
│   │   ├── App.tsx                 # Main app component
│   │   ├── api.ts                  # API client
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── config.ts               # Category config & utilities
│   │   └── components/
│   │       ├── Header.tsx          # Search bar & branding
│   │       ├── Sidebar.tsx         # Category navigation
│   │       ├── FileList.tsx        # File listing panel
│   │       └── FileViewer.tsx      # Markdown viewer
│   ├── package.json
│   └── rsbuild.config.ts
├── data/                           # Scientific knowledge files
│   ├── physics/
│   ├── biology/
│   ├── chemistry/
│   ├── computer-science/
│   └── mathematics/
├── .github/workflows/
│   └── sync-d1.yml                 # D1 sync CI/CD pipeline
└── docs/                           # You are here
    ├── README.md                   # This file
    ├── architecture.md
    ├── api-reference.md
    ├── data-format.md
    ├── frontend-guide.md
    ├── deployment.md
    ├── development.md
    └── agent-integration.md
```
