# Deployment Guide

## Architecture Overview

The Open Scientific Base is designed for **edge-first deployment** on Cloudflare's global network:

```
                 Cloudflare Edge
┌────────────────────────────────────────────────────┐
│                  Cloudflare Worker                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  Rust Binary compiled to WebAssembly         │    │
│  │  (Axum HTTP server)                          │    │
│  └────────────────────┬────────────────────────┘    │
│                       │                              │
│              ┌────────▼────────┐                     │
│              │  Cloudflare D1  │                     │
│              │  (Serverless     │                     │
│              │   SQLite + FTS5) │                     │
│              └─────────────────┘                     │
└────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Cloudflare Account** — [Sign up](https://dash.cloudflare.com/signup)
2. **Wrangler CLI** — `npm install -g wrangler` (or `npx wrangler`)
3. **Authenticate Wrangler** — `npx wrangler login` (browser-based OAuth)
4. **Rust toolchain** (for local compilation) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

## Step 1: Create the D1 Database

```bash
# Create the database in your Cloudflare account
npx wrangler d1 create scientific-base

# Output:
# ✅ Successfully created DB 'scientific-base' in region ...
# [[d1_databases]]
# binding = "DB"
# database_name = "scientific-base"
# database_id = "<your-database-id>"
```

**Copy the `database_id`** from the output — you'll need it for the next step.

## Step 2: Configure `wrangler.toml`

Uncomment and fill in the D1 database binding in `api/wrangler.toml`:

```toml
name = "open-scientific-base-api"
main = "build/worker/shim.mjs"
compatibility_date = "2024-12-18"
compatibility_flags = ["nodejs_compat"]

workers_dev = true

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "scientific-base"
database_id = "<your-database-id>"  # ← Replace with actual ID
```

## Step 3: Deploy the D1 Schema

```bash
# Apply the schema to your D1 database
npx wrangler d1 execute scientific-base --file=api/schema.sql --remote

# Expected output:
# ✅ Executed SQL from api/schema.sql
```

This creates the `files` table, the `files_fts` FTS5 virtual table, and all triggers and indexes.

## Step 4: Seed the Database with Data Files

```bash
# Run the sync workflow locally to populate D1
find data -name '*.md' | while read -r filepath; do
  # ... (see .github/workflows/sync-d1.yml for the full sync script)
  
  # Or use the manual approach:
  npx wrangler d1 execute scientific-base \
    --command="INSERT OR REPLACE INTO files (id, path, title, category, tags, content, version, last_updated) VALUES (...)" \
    --remote
done
```

For large datasets, run the **GitHub Actions workflow** (see CI/CD Pipeline below) or use the provided sync script.

## Step 5: Deploy the Rust API to Cloudflare Workers

**Option A: Using `cargo` (recommended for development):**

Currently, the Rust code runs as a standalone Axum server. For Cloudflare Workers deployment, you'll need to:

1. Add the `worker` crate and the `worker-macros` for Workers compatibility
2. Replace `axum::serve` with `worker::event` handlers
3. Add D1 bindings to access the database

```bash
# Build for Workers (requires additional crate)
cargo build --target wasm32-unknown-unknown --release

# Deploy
npx wrangler deploy
```

**Option B: Using the development server (standalone deployment):**

For simple deployments, you can run the Rust server on a VM/VPS:

```bash
# Build the binary
cargo build --release

# Run it (serves on 0.0.0.0:3001)
./target/release/open-scientific-base
```

Then put **Cloudflare** in front of it as a reverse proxy (recommended):

```
Cloudflare CDN ──▶ Your VPS (port 3001) ──▶ Rust binary
```

## Step 6: Deploy the Frontend

### Option A: Cloudflare Pages

```bash
# Build the frontend
cd frontend
bun run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist/ --project-name open-scientific-base
```

### Option B: Static Hosting (Vercel, Netlify, S3, etc.)

```bash
cd frontend
bun run build

# Upload the dist/ directory to your static host
# Configure the API URL via VITE_API_URL env var
```

## Environment Variables

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | URL of the API server |

Set this in your `.env` file or in your hosting platform's environment settings:

```
VITE_API_URL=https://your-worker.your-subdomain.workers.dev
```

### API (Cloudflare Workers Secrets)

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers + D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

Set these with:

```bash
echo "your-api-token" | npx wrangler secret put CLOUDFLARE_API_TOKEN
echo "your-account-id" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
```

## CI/CD Pipeline (GitHub Actions)

The repository includes a workflow at `.github/workflows/sync-d1.yml` that:

1. **Triggers** on pushes to `main` that modify `data/**` or `api/schema.sql`
2. **Sets up** Node.js and Python
3. **Creates** the D1 database if it doesn't exist
4. **Deploys** the schema (`schema.sql`) to D1
5. **Syncs** all markdown files to D1 (parses frontmatter, upserts into `files` table)
6. **Reports** summary of synced files

### Required Secrets

For the workflow to run, add these to your repository's **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with D1 edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Manual Trigger

You can also trigger the workflow manually from the GitHub Actions UI:

1. Go to **Actions** → **Sync D1 Database**
2. Click **Run workflow**
3. Select branch and click **Run**

## Production Checklist

- [ ] D1 database created and schema deployed
- [ ] `wrangler.toml` configured with D1 database ID
- [ ] GitHub secrets configured (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- [ ] Frontend `VITE_API_URL` points to production API URL
- [ ] CORS origin restricted in production (not `Allow-Origin: *`)
- [ ] Rate limiting configured at Cloudflare edge
- [ ] Monitoring/alerts set up for API availability
- [ ] Backup strategy for D1 database (periodic exports)

## Monitoring

### Cloudflare Analytics

The Cloudflare dashboard provides:

- **Request count** and **bandwidth** for the Worker
- **Error rate** and **status code distribution**
- **D1 query** performance and row count

### Health Check

The `/api/health` endpoint returns:

```json
{
  "status": "ok",
  "service": "open-scientific-base",
  "version": "0.1.0"
}
```

Use this for uptime monitoring (e.g., UptimeRobot, Pingdom).

## Backup and Recovery

### Export D1 Database

```bash
npx wrangler d1 execute scientific-base \
  --command="SELECT * FROM files" \
  --remote --json > backup-$(date +%Y-%m-%d).json
```

### Restore from Backup

```bash
npx wrangler d1 execute scientific-base \
  --file=backup-2026-07-11.sql \
  --remote
```

## Troubleshooting

### D1 Database Not Found

```bash
Error: A requested resource was not found. The API returned ...

Solution:
1. Ensure the database exists: npx wrangler d1 list
2. Create it: npx wrangler d1 create scientific-base
3. Update wrangler.toml with the correct database_id
```

### Worker Deploy Fails

```bash
Error: No build found. Did you run a build command?

Solution:
1. Ensure you build the Rust project first
2. Check wrangler.toml has the correct main field
3. Verify compatibility_date is recent
```

### CORS Errors (Frontend)

```
Access to fetch at 'http://localhost:3001/api/files' from origin 'http://localhost:3000' has been blocked by CORS policy

Solution:
1. Local dev: CORS is permissive, ensure the API is running
2. Production: Update cors.rs to allow your frontend domain
```
