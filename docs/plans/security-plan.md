# Security Plan

> **Status:** Input validation implemented; auth and rate limiting planned
> **Updated:** 2026-07-11

## Current Security Posture

| Layer | Status | Detail |
|-------|--------|--------|
| **Input Validation** | ✅ Implemented | JSON schema + YAML frontmatter validation |
| **CORS** | ✅ Implemented | Permissive for dev (`Allow-Origin: *`) |
| **Authentication** | ❌ None | No auth layer (intended for internal use) |
| **Authorization** | ❌ None | Any client can read/write |
| **Rate Limiting** | ❌ None | No request throttling |
| **Secrets Management** | ⏳ Partial | GitHub secrets configured via Actions |
| **HTTPS** | ⏳ Automatic | Cloudflare provides TLS termination |

## Threat Model

### Identified Threats

| Threat | Severity | Likelihood | Mitigation |
|--------|----------|------------|------------|
| Malformed input crash | Low | Medium | Serde validation catches all malformed JSON |
| YAML injection | Low | Low | `deny_unknown_fields` + field-level validation |
| XSS via markdown content | Medium | Low | React auto-escapes text; no `dangerouslySetInnerHTML` |
| Unauthorized data access | High | Medium | ⏳ Need auth layer for production |
| Unauthorized data modification | High | Medium | ⏳ Need auth + rate limiting |
| DDoS via search | Medium | Low | ⏳ Need rate limiting |
| Dependency vulnerability | Medium | Low | Regular `cargo audit` + `npm audit` |

### Out of Scope (Current)

- **SQL Injection**: Not applicable — D1 uses parameterized queries via wrangler
- **CSRF**: Not applicable — stateless API, no cookies
- **Session hijacking**: Not applicable — no sessions
- **Server-side request forgery**: Not applicable — no outgoing requests from API

## Input Validation Architecture

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Axum Router — Path extraction    │
│    • /api/files/{id} → id parameter │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Serde Deserialization            │
│    • JSON body → Rust struct        │
│    • Rejects: wrong types, missing  │
│      required fields, extra fields  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. Frontmatter Validation           │
│    • YAML parse (serde_yaml)        │
│    • deny_unknown_fields            │
│    • Field-level validation:        │
│      - ID format: {prefix}-{number} │
│      - Version: X.Y.Z semver        │
│      - Date: YYYY-MM-DD ISO          │
│      - Tags: at least 1             │
│      - Category: non-empty          │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 4. Business Logic                   │
│    • File exists check              │
│    • Version auto-increment         │
│    • Date auto-update               │
└─────────────────────────────────────┘
```

## Production Security Hardening

### Phase 1: Authentication (Short-term)

**Approach:** API key-based authentication via `Authorization` header

```rust
// Future middleware in handlers.rs
pub async fn auth_middleware(
    headers: HeaderMap,
    next: Next,
) -> Result<impl IntoResponse, AppError> {
    let api_key = headers
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::unauthorized("Missing x-api-key header"))?;

    if !is_valid_key(api_key) {
        return Err(AppError::unauthorized("Invalid API key"));
    }

    Ok(next.run(request).await)
}
```

### Phase 2: CORS Hardening

```rust
// Production CORS — restrict to known domains
let cors = CorsLayer::new()
    .allow_origin([
        "https://scientific-base.pages.dev".parse().unwrap(),
        "http://localhost:3000".parse().unwrap(),
    ])
    .allow_methods([Method::GET, Method::POST])
    .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);
```

### Phase 3: Rate Limiting

```yaml
# Cloudflare WAF rule
name: "API Rate Limit"
description: "Prevent abuse of the knowledge base API"
requests_per_period: 100
period: 60
mitigation_action: "block"
expression: "(http.request.uri.path starts with \"/api/\")"
```

### Phase 4: Environment Segregation

```toml
# wrangler.toml — separate environments
[env.staging]
name = "open-scientific-base-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "open-scientific-base-production"
vars = { ENVIRONMENT = "production" }
```

## Dependency Security

### Rust

```bash
# Audit dependencies for known vulnerabilities
cargo install cargo-audit
cargo audit

# Check for outdated dependencies
cargo outdated
```

### Frontend

```bash
# Audit npm dependencies
cd frontend && bun audit

# Check for outdated packages
bun outdated
```

### Automated Scanning

```yaml
# Future: Add to CI pipeline
- name: Security audit
  run: cargo audit
- name: npm audit
  run: cd frontend && npm audit
```

## Incident Response

### If a vulnerability is discovered:

1. **Identify** — Determine if the vulnerability affects our code or a dependency
2. **Contain** — If API is public, restrict access via Cloudflare WAF
3. **Patch** — Update dependency or fix code
4. **Verify** — Run full test suite
5. **Deploy** — Push fix to production
6. **Document** — Log the incident and lessons learned

### Monitoring

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| 5xx error rate | >1% in 5 minutes | Investigate API crashes |
| 4xx error rate | >10% in 5 minutes | Check for client issues |
| Request latency (p99) | >500ms | Performance regression |
| Unknown endpoint hits | >100/min | Possible scanning attack |

## Data Privacy

**Current:** All data is public scientific knowledge — no PII stored
**Guideline:** Never submit proprietary or personal data to the knowledge base
**Future:** Add `access_level` field for sensitive content
