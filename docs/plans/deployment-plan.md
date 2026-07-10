# Deployment Plan

> **Status:** CI/CD workflow created; cloud deployment pending
> **Updated:** 2026-07-11

## Deployment Architecture

```
┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Developer      │     │  GitHub Actions  │     │   Cloudflare    │
│   Push to main   │────▶│                  │────▶│   Edge Network  │
└──────────────────┘     │  - Check code    │     │                 │
                         │  - Run tests     │     │  ┌───────────┐  │
                         │  - Deploy API    │     │  │ Worker    │  │
                         │  - Sync D1       │     │  │ (Rust)    │  │
                         │  - Deploy UI     │     │  └───────────┘  │
                         └─────────────────┘     │  ┌───────────┐  │
                                                 │  │ D1        │  │
                                                 │  │ (SQLite)  │  │
                                                 │  └───────────┘  │
                                                 │  ┌───────────┐  │
                                                 │  │ Pages     │  │
                                                 │  │ (React)   │  │
                                                 │  └───────────┘  │
                                                 └─────────────────┘
```

## Environment Strategy

| Environment | Purpose | URL | D1 Database |
|-------------|---------|-----|-------------|
| **Development** | Local coding | `localhost:3001` (API), `localhost:3000` (UI) | In-memory mock |
| **Preview** | PR review | `pr-NNN.scientific-base.pages.dev` | `scientific-base-staging` |
| **Staging** | Integration tests | `staging.scientific-base.workers.dev` | `scientific-base-staging` |
| **Production** | Live | `api.scientific-base.workers.dev` | `scientific-base-prod` |

## Current Deployment State

### Local Development

```bash
# Terminal 1: API server
cd api && cargo run
# → http://localhost:3001

# Terminal 2: Frontend
cd frontend && bun run dev
# → http://localhost:3000
```

**CORS:** Permissive (`Allow-Origin: *`) — works across any local port

### CI/CD Pipeline (Created)

The `.github/workflows/sync-d1.yml` workflow currently handles:

1. **Checkout** — Pull the latest code
2. **Setup** — Node.js 22 + Python dependencies
3. **D1 Provisioning** — `npx wrangler d1 create scientific-base || true`
4. **Schema Deploy** — `npx wrangler d1 execute --file=api/schema.sql`
5. **Data Sync** — Parse each `.md` file with PyYAML and UPSERT into D1
6. **Summary** — Report sync status in GitHub Actions

### Deployed Infrastructure Status

| Component | Status | Method |
|-----------|--------|--------|
| D1 Database | ⏳ Not provisioned | Needs Cloudflare account |
| Rust Worker | 📋 Planned | Requires WASM compilation |
| Frontend Pages | 📋 Planned | `npx wrangler pages deploy dist/` |
| Custom Domain | 📋 Planned | Points to Cloudflare |

## Deployment Pipeline — Full

### Phase A: Frontend to Cloudflare Pages

```bash
# Build
cd frontend && bun run build

# Deploy (one-time setup)
npx wrangler pages project create open-scientific-base

# Deploy (every push)
npx wrangler pages deploy dist/ \
  --project-name open-scientific-base \
  --branch main
```

**Environment Variables:**

```bash
npx wrangler pages secret put VITE_API_URL
# → https://api.scientific-base.workers.dev
```

### Phase B: Rust API to Cloudflare Workers

**Step 1:** Add `worker` crate for WASM compatibility

```toml
# api/Cargo.toml additions
[dependencies]
worker = { version = "0.4", features = ["axum"] }
wasm-bindgen = "0.2"
```

**Step 2:** Create Workers entrypoint

```rust
// api/src/worker.rs — Cloudflare Workers entrypoint
use worker::*;

#[event(fetch)]
pub async fn main(req: Request, env: Env) -> Result<Response> {
    // Initialize D1 binding
    let d1 = env.d1("DB")?;

    // Build Axum app with D1 store
    let app = axum::Router::new()
        .route("/api/health", routing::get(handlers::health_check))
        // ... all routes
        .with_state(d1);

    // Serve via worker
    axum::serve(app, req).await
}
```

**Step 3:** Deploy

```bash
cargo build --target wasm32-unknown-unknown --release
npx wrangler deploy
```

### Phase C: Automated CI/CD

```yaml
# Future: Full CI/CD workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd api && cargo test
      - run: cd frontend && bun install && bun run test && bun run check

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd api && cargo build --release
      - run: npx wrangler deploy

  deploy-ui:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && bun install && bun run build
      - run: npx wrangler pages deploy dist/

  sync-d1:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx wrangler d1 execute scientific-base --file=api/schema.sql
      - run: python3 scripts/sync-d1.py
```

## Rollback Strategy

### Frontend Rollback

```bash
# Cloudflare Pages — instant rollback to previous deployment
npx wrangler pages rollback --project-name open-scientific-base
```

### D1 Rollback

```bash
# D1 does not support snapshots — use backup strategy
# Restore from last backup:
npx wrangler d1 execute scientific-base \
  --file=backups/2026-07-11.sql \
  --remote

# Or sync from Git (re-run sync workflow)
```

### Full Rollback

```bash
# 1. Revert the Git commit
git revert HEAD
git push origin main

# 2. GitHub Actions auto-deploys the reverted state
```

## Monitoring

### Post-Deployment Checks

```bash
# Health check
curl https://api.scientific-base.workers.dev/api/health

# Verify files accessible
curl https://api.scientific-base.workers.dev/api/files | jq length

# Test search
curl -X POST https://api.scientific-base.workers.dev/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"quantum"}' | jq length

# Check categories
curl https://api.scientific-base.workers.dev/api/categories | jq '.'
```

### Cloudflare Dashboard

Monitor these metrics after deployment:

- **Worker Requests** — Sudden spike/drop indicates misconfiguration
- **D1 Query Count** — Expected increase with new queries
- **Error Rate** — >0% indicates issues
- **Latency (p95)** — >200ms indicates performance regression

## Backup Strategy

```bash
# Daily D1 backup via cron
0 2 * * * /usr/local/bin/backup-d1.sh

# backup-d1.sh content:
#!/bin/bash
DATE=$(date +%Y-%m-%d)
npx wrangler d1 execute scientific-base \
  --command=".dump" \
  --remote > backups/scientific-base-$DATE.sql
gzip backups/scientific-base-$DATE.sql

# Retain 30 days
find backups/ -name "*.sql.gz" -mtime +30 -delete
```
