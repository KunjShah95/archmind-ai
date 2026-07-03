# ArchMind AI v2 Full Stack — Production-Grade Overhaul Plan

**Objective:** Resume-grade architecture analysis platform with >70 avg scores, 99% uptime, <2s response times, team collaboration, and enterprise features.

**Duration:** 12 weeks across 5 phases (backend, frontend, observability, infrastructure, compliance).

**Success Metrics:**
- >70 average architecture score (validated on golden-set regression tests)
- p99 API latency < 2s (verified under 1000 concurrent users via Locust)
- 99% uptime SLA (blue-green k8s deployment with auto-recovery)
- Zero silent failures (structured logging + Sentry)
- Team features shipped (role-based access, audit trail, version history)

---

## PHASE 1: Testing Foundation (Weeks 1–2)

### Backend Testing Infrastructure
**Objective:** Close the gap from 0% API/router coverage to 80%+ comprehensive testing.

**Key Changes:**
- **Extend `conftest.py`:** Add `client` (TestClient), `auth_user`, `seed_workspace` fixtures so routers are exercised end-to-end.
- **New test structure:**
  - `tests/unit/` — pure logic (agents, LLM extraction, diagram parsing)
  - `tests/integration/` — parametrized router access-control tests (20+ endpoints all need 404-on-unauthorized verification), pipeline orchestration, exports
  - `tests/e2e/` — full analysis flow (upload → analyze → findings → export)
- **Coverage targets:** 80% backend, 60% frontend critical paths (AnalysisDetail, PairArchitect)
- **Tools:** Existing pytest suite extended; add `pytest-cov` + `freezegun` (JWT token expiry testing)

**Critical Router Tests (highest bug surface):**
```python
# Parametrized across all /{analysis_id}/* endpoints
@pytest.mark.parametrize("endpoint", ["/analyses/{id}", "/agents/{id}", "/chat/{id}", ...])
def test_analysis_endpoints_block_non_members(client, endpoint, db):
    # Assert 404 when user is not in workspace
```

**Critical API Tests:**
- `test_analyses_api.py` — POST `/api/analyses`, quota enforcement (402), workspace isolation
- `test_export_api.py` — each format (json/md/html/csv/pdf) returns correct MIME + content
- `test_pipeline_flow.py` — create → status polling → findings persist → mediator report

### Frontend Testing
- **Setup:** Vitest + Testing Library + MSW (mock service worker for `/api/*`)
- **Scope:** AnalysisDetail (tabs, findings list, loading/error states), PairArchitect (message send, Mermaid update), Upload (file-size guard)
- **Critical path:** Navigation-free pages that show up first (AnalysisDetail, Upload, PairArchitect)

### Migration Risk Mitigation
- All new tests use in-memory SQLite (no DB state leaks)
- Backward-compatible fixtures (existing tests unaffected)
- CI gates on `pytest --cov-fail-under=80` before merge

---

## PHASE 2A: Observability & Error Handling (Weeks 1–2, parallel with Phase 1)

### Backend Logging & Error Recovery
**Critical Issue:** `_run_pipeline_task` swallows all exceptions → analyses stuck on "analyzing" forever, false "ready" status with no error signal.

**Changes:**
- **New `app/observability.py`:** Structured logging via `structlog` (JSON in prod, console dev), correlation IDs via `ContextVar`.
- **New `app/errors.py`:** `PipelineError` with error code + failed step + retryable flag.
- **Middleware in `main.py`:** Correlation-ID injection + global exception handler that logs + returns sanitized 500.
- **Error columns in `Analysis` model:** `error_code`, `error_message`, `failed_step`, `used_heuristic`, `score_source`.
- **Pipeline rewrite:** Wrap each stage (diagram parse, vision extract, agents, mediator, persist) in `step_context()` that catches and persists errors without silencing them.
- **Fix exception swallowing in `llm.py`:** Replace bare `except Exception: return None` with per-provider logging at WARNING level before graceful fallback.

**Dependency Addition:** `structlog==24.4.0`, `python-json-logger`

**Alembic Migration:** Additive 5 columns + indices on FK columns.

---

## PHASE 2B: Scoring Accuracy & Confidence (Weeks 3–4)

### Multi-Model Ensemble Scoring
**Current Problem:** Heuristic fallback inflates scores to 90/100; single-pass LLM; mediator report is informational only, doesn't influence scores.

**New Service `app/services/scoring.py`:**
- Weighted ensemble: `compute_ensemble(llm_score, heuristic_score, pattern_score, weights)` → combines three signals with configurable weights (default: 0.5 LLM / 0.3 heuristic / 0.2 pattern).
- Confidence metric: variance-based (clustered signals = high confidence; divergent = low).
- Eliminates the artificial 92-floor in heuristic paths.

**New Service `app/services/patterns.py`:**
- Real architecture pattern detection (Netflix microservices, Uber event-driven, Airbnb booking, Shopify commerce).
- Structural health scoring per pattern (0-100%).
- Returns matched/missing components → feeds agent prompts with context.

**Agent Enhancements:**
- Enhanced prompts with detected patterns, scale context, industry benchmarks.
- Per-finding `confidence` score (0-100%).
- Verification pass: LLM re-scores its own findings for low-signal detection.

**Mediator Integration:**
- Mediator's `score_by_agent` now blends into persisted scores (60% mediator / 40% ensemble).
- Mediator failure handled gracefully (fallback to ensemble + logged).

**Alembic Migration:** Add `confidence` column to `Finding`.

---

## PHASE 2C: Database Safety & Atomicity (Weeks 5–6)

### Indices, Soft Deletes, Audit Trail
**Performance + compliance fixes:**
- **Indices:** Add to `Finding(analysis_id, agent)`, `Analysis(workspace_id, author_id)`, `WorkspaceMember(user_id, workspace_id)`, composite `(workspace_id, status, created_at)`.
- **Soft deletes:** `deleted_at` column on Analysis + Finding; queries default-filter on `deleted_at IS NULL`.
- **Audit fields:** `Finding(modified_by, modified_at, confidence)` for version history + compliance.
- **Atomic quota:** Replace read-then-write with single SQL UPDATE; compensating `release_analysis_slot` on failure.
- **Connection pooling:** Configure pool size / timeout / pre-ping on Postgres (SQLite unaffected).

**Refactor:** Centralize soft-delete queries in `app/repositories.py` (`active_analyses()`, `active_findings()`) to prevent leaked deleted rows.

**Migration:** One atomic Alembic revision covering all changes; use `CREATE INDEX CONCURRENTLY` for Postgres prod to avoid write locks.

---

## PHASE 2D: Retry & Dead-Letter Queue (Weeks 7–8)

### Resilience & Recovery
**Add `FailedAnalysis` model** (dead-letter queue):
- Track failed analyses with error context, retry count, next-retry-at (exponential backoff).
- Provides a recovery path for transient LLM/network failures.

**New `app/services/retry.py`:**
- `schedule_retry()` — enqueue with backoff (`base_delay * 2^attempt`, capped, jitter).
- `process_retry_queue()` — worker loop (external scheduler or background job).
- Atomic retry-lock (SQL `FOR UPDATE SKIP LOCKED`) for multi-worker safety.

**Status state machine:** `queued → analyzing → partial_results → retry → ready` (terminal: `failed`).

**Endpoints:**
- `POST /{analysis_id}/retry` — manual retry (admin/user-facing).
- `GET /{analysis_id}/status` — lightweight status polling.

**Deployment options:**
- Option A (recommended): External scheduler (Render Cron / systemd timer) hits `/api/internal/retry/tick`.
- Option B: Background scheduler (`apscheduler`) in app lifespan (requires distributed lock on multi-worker deployments).

---

## PHASE 3: Frontend Refactoring & Architecture (Weeks 9–11)

### Query Layer & Custom Hooks
**Problem:** Every page constructs raw query keys inline; duplicate code; no RBAC hooks; tokens in localStorage (XSS risk).

**New `src/lib/queryKeys.ts`:**
```typescript
export const qk = {
  analyses: (q?: string) => ['analyses', q ?? ''] as const,
  analysis: (id: string) => ['analysis', id] as const,
  agentReport: (id: string, agent: string) => ['analysis', id, 'agent', agent] as const,
  // ... (all keys centralized)
};
```

**New `src/hooks/queries.ts` & `mutations.ts`:**
- Thin wrappers over api + TanStack Query: `useAnalyses()`, `useAnalysisDetail()`, `useAgentReport()`, `useCreateAnalysis()`, `useSendChatMessage()`, etc.
- Polling refetchInterval moved into hooks (AnalysisDetail gets live-status for free).
- All invalidations go through `qk` → single source of truth.

**New `src/hooks/utility.ts`:**
- `useAsync.ts` — imperative async (ApiError-aware, retry-aware).
- `useLocalStorage.ts` — typed, schema-validated (Zod), cross-tab sync.
- `useDebounce.ts`, `usePagination.ts`, `useWorkspaceRole.ts` — RBAC gating.

### Security: httpOnly Cookies
**Backend (new router `app/routers/session.py`):**
- `POST /api/auth/session` — accepts Supabase token, sets httpOnly cookie + CSRF cookie.
- `POST /api/auth/logout` — clears.
- Auth middleware: accept credentials from cookie + header (backward-compat migration).

**Frontend:**
- `api.ts`: Add `credentials: 'include'`, attach `X-CSRF-Token` header on mutations.
- `AuthContext`: Call session endpoint instead of `setStoredToken`; drop localStorage token.
- Migration: Auto-exchange legacy token for cookie on first load.

### TypeScript Strictness
- Flip `strict: true` in `tsconfig.app.json`.
- Incremental adoption: `tsconfig.strict.json` for new files week 1, backfill pages week 2–3.
- Add ESLint rule: `@typescript-eslint/no-explicit-any` (warn).

### Component Decomposition
**Refactor `AnalysisDetail.tsx` (576 → 120 LOC page):**
- Extract into `src/features/analysis/components/`: `DiagramViewer`, `FindingsList`, `FindingCard`, `ScoreGrid`, `ExecutiveReportPanel`, `ChatPanel`.
- Move memoization logic into `useAnalysisDiagram` hook.
- Move form logic to `useZodForm` (react-hook-form + Zod).

**Error Boundaries:**
- Page-level `<RouteErrorBoundary>` wrapping each route.
- Resets on route change via `resetKeys`.

**Directory refactor:** `src/features/{analysis,collaboration,exports,realtime}/` — feature-first cohesion.

---

## PHASE 3B: Team Collaboration & Advanced Exports (Weeks 12–14)

### Database Additions (backend)
New tables (created via Alembic):
- `workspace_invites` (email, role, token, expiry, status)
- `audit_events` (actor, action, entity, metadata)
- `finding_versions` (snapshot, version_no, change_type)
- `share_links` (token, scope, expiry)

New endpoints:
- `POST /api/workspaces/{id}/invites`, `DELETE /api/workspaces/{id}/members/{id}`, `PATCH .../members/{id}` (role)
- `GET /api/analyses/{id}/audit`, `GET /api/analyses/{id}/versions`, `POST /api/analyses/{id}/share`
- RBAC enforcement server-side (role checking dependency)

### Frontend Routes & Components
```
/workspaces/:wsId              → WorkspaceDetail (members, invites, roles)
/workspaces/:wsId/activity     → ActivityFeed
/analyses/:id/history          → VersionHistory (browser + diff)
/analyses/:id/audit            → AuditTrail
/shared/:token                 → SharedAnalysisView (unauthenticated)
/compare?a=..&b=..             → enhanced Compare (score deltas, finding diff)
/analyses/:id/report-builder   → custom report (sections, severity filter, export)
```

**Components:** `MembersTable`, `InviteMemberDialog`, `ActivityFeed`, `VersionHistory`, `AuditTrail`, `ShareAnalysisDialog`, `ComparisonView`, `FindingsOverTimeChart`, `ReportBuilder`.

**RBAC UI pattern:** `useWorkspaceRole()` → `<RoleGate allow={['owner','editor']}>` (disable for viewers, tooltip).

### Advanced Exports
- **PDF with charts:** Render recharts client-side (SVG), POST to backend, embed in PDF via existing `to_pdf()` (add chart image support).
- **Excel multi-sheet:** New backend endpoint `export/xlsx` (openpyxl) — Findings/Scores/Trend/Summary sheets.
- **Markdown TOC:** Extend existing MD export with anchor-link table of contents.
- **Report builder:** Select sections (diagram, scores, findings, debate, summary), filter by severity, pick audience, export.

---

## PHASE 4: Infrastructure & Observability (Weeks 15–16)

### Observability Stack
**Metrics (Prometheus):**
- `prometheus-fastapi-instrumentator` for request duration/count/errors.
- Custom metrics: `llm_call_duration_seconds{provider,model}`, `pipeline_duration_seconds`, `architecture_score` (histogram).
- Expose `/metrics` (internal only).

**Structured Logging:**
- Correlation IDs flowing through all services (via `ContextVar`).
- JSON structured logs (Sentry + centralized log aggregation).
- Per-provider LLM logging (no API keys, latency + status).

**Error Tracking:** Sentry integration (backend + frontend error boundaries).

**Grafana Dashboards (PromQL):**
```
p99 API latency (SLA <2s):
  histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

Rolling avg architecture score (SLA >70):
  avg_over_time(architecture_score_sum[1h]) / avg_over_time(architecture_score_count[1h])

Error rate:
  sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

Pipeline failure rate:
  sum(rate(pipeline_status_total{status="failed"}[10m])) / sum(rate(pipeline_status_total[10m]))

LLM availability (all providers):
  sum(rate(llm_call_failures_total[5m]))
```

### Load Testing & Performance Optimization
**Critical prerequisite:** Remove artificial `time.sleep(0.15)` loop in `pipeline.py` (adds 1.35s to every analysis).

**Locust scenarios:**
- Baseline: 100 users, 70% GET analyses (poll), 15% POST create, 10% export, 5% chat.
- Stress: 1000 users (10×), assert p99 < 2s, rolling score > 70.

**Caching (Redis):**
- LLM response cache (key = SHA256(provider+model+prompt), TTL 24h) — **biggest latency + cost lever**.
- Query result cache (lists, agent-meta, 5m TTL).
- Task queue broker (Arq/Celery workers).

**N+1 Audit:**
- `list_analyses` uses `.options(joinedload(...))` to fetch workspace + author in one query.
- `get_analysis` eager-loads findings + messages.

**Performance checklist:**
- [ ] Remove artificial sleep in pipeline
- [ ] LLM response cache (Redis, 24h TTL)
- [ ] Eager-load in `list_analyses` / `get_analysis`
- [ ] DB indices on all FK columns
- [ ] Connection pooling (pool_size=10, max_overflow=20)
- [ ] Frontend code-split (React.lazy for heavy pages)
- [ ] CDN cache-control on assets

### Containerization (Docker)
**Backend multi-stage Dockerfile:**
- Builder stage: install deps.
- Runtime: non-root user, include `alembic/` + `alembic.ini` (currently missing), healthcheck on `/api/health`.
- Workers: separate image (Arq-based).

**Frontend:** Vite build + nginx serving with SPA fallback.

### Kubernetes Deployment
```
k8s/
  namespace.yaml
  backend-deployment.yaml    (replicas: 3, resources, readiness/liveness probes)
  backend-hpa.yaml           (min 3, max 20, target 70% CPU)
  worker-deployment.yaml     (Arq workers, KEDA HPA on Redis queue depth)
  frontend-deployment.yaml   (nginx, replicas: 2)
  ingress.yaml               (TLS via cert-manager, routes /api → backend, / → frontend)
  configmap.yaml             (non-sensitive config)
  secret.yaml                (DATABASE_URL, SUPABASE_JWT_SECRET, provider keys, SENTRY_DSN)
  redis.yaml                 (or managed: ElastiCache/Memorystore)
  pdb.yaml                   (PodDisruptionBudget for zero-downtime drains)
```

**Readiness probe:** Hits `/api/health` (already exists).

**Blue-green deployments:** Two Deployments, one Service selector; flip after smoke tests; instant rollback = flip back.

### CI/CD (GitHub Actions)
```yaml
# .github/workflows/ci.yml
on: [pull_request]
- lint (backend + frontend)
- pytest --cov-fail-under=80
- bun run test
- docker build (no push)

# .github/workflows/deploy.yml
on: [push to main]
- build+push images
- migrate Job (alembic upgrade)
- deploy staging → E2E smoke → prod blue-green
```

Use OIDC (no static credentials).

### Database Migration Strategy
- **Alembic remains sole schema authority** (no `create_all` in prod).
- **Move migrations out of app boot:** Kubernetes Job (or Helm pre-install hook) runs `alembic upgrade head` once; keep `init_db()` for local/dev only.
- **Backups:** Supabase daily + PITR; additionally schedule nightly `pg_dump` to versioned S3 (30-day retention) for portable restore.
- **Expand-contract pattern:** Add nullable → backfill → enforce (safe for blue-green).

---

## PHASE 5: Security & Compliance (Weeks 17–18)

### HTTPS & CORS
- TLS enforced at ingress (cert-manager + Let's Encrypt).
- HSTS header in `security_headers` middleware.
- `allow_credentials=True` in CORS; origin pinned to actual frontend domain.

### Input Validation & Rate Limiting
- Tighten `max_length` on free-text fields (bound LLM prompt size).
- MIME/extension allowlist on file upload.
- Add `slowapi` rate limiting (strict on auth + expensive operations like `POST /api/analyses`).

### Audit Logging (SOC 2 + GDPR)
- `AuditLog` table: actor, action, entity, metadata, timestamp.
- Write entries on every data access/mutation (captured via `audit_events` table, fed by role-enforced endpoints).
- Retention: ≥ 1 year, append-only, versioned S3 backup.

### RBAC Enforcement
- `require_role(min_role)` dependency on sensitive endpoints; currently only membership checked.
- Role-based UI gates (viewers can't create/edit/export).

### GDPR Compliance
- Data export endpoint (full user account + all analyses as JSON/markdown).
- Hard-delete endpoint (cascade to S3, scrub audit logs of deleted entity refs).
- Consent tracking on signup; privacy policy discloses LLM data flow.
- DPAs with Supabase + each LLM provider.

**Critical note:** User diagrams are sent to third-party LLM providers (Groq/NVIDIA/OpenRouter/Gemini/HuggingFace) — this must be disclosed; consider a "no external LLM" tier (Ollama only) for privacy-sensitive customers.

### Secrets Management
- Kubernetes Secrets or External Secrets Operator (ESO).
- No keys in images, repo, or environment files.
- Rotation policy (auto-rotate provider keys via backends).

---

## Rollout Strategy & Risk Mitigation

### Feature Flags
Ship each major change behind a flag (can disable in prod if issues arise):
- `scoring_v2_enabled` — run v2 scoring in shadow mode (compute, compare distributions, then flip).
- `retry_enabled` — enable dead-letter queue retry logic.
- `team_collaboration_enabled` — gate 2B features to paid plans.

### Backward Compatibility
- Backend accepts both legacy bearer tokens (localStorage) and new httpOnly cookies for 2 release cycles.
- Frontend auto-exchanges legacy token on boot.
- All schema additions are nullable/defaulted (no destructive migrations).

### Validation Gates
- **Golden-set regression harness:** 5–8 fixture architectures with expected score ranges; assert before each release.
- **Load test validation:** Locust runs confirm p99 < 2s and rolling score > 70 under 1000 users.
- **E2E smoke:** Staging environment with full flow verification before prod promotion.
- **Metrics review:** 48h in prod with monitoring dashboard active before declaring success.

### Staging Environment
- Full Kubernetes mirror with separate Supabase project.
- Deploy every main push; run E2E before promotion.
- Database seeded with test analyses (for load/regression testing).

---

## Testing & Verification Checklist

### Unit Tests
- [ ] Agents (LLM + heuristic paths) score correctly
- [ ] Ensemble scoring math (weighted average, confidence calculation)
- [ ] Pattern detection (Netflix/Uber/Airbnb/Shopify recognition)
- [ ] Diagram parsing (Mermaid, PlantUML, Terraform)
- [ ] JSON extraction from LLM prose

### Integration Tests
- [ ] Full analysis pipeline (upload → parse → agents → mediator → persist)
- [ ] Access control on all `/analyses/{id}/*` endpoints
- [ ] Quota enforcement (blocking at limit, compensation on failure)
- [ ] Soft-delete filtering (deleted rows excluded from lists)
- [ ] Export formats (PDF + charts, Excel multi-sheet, Markdown + TOC)
- [ ] Chat message persistence + optimistic rollback on error
- [ ] Workspace member RBAC (viewers see but can't modify)

### Load Tests
- [ ] 100 concurrent users, p99 latency < 2s (baseline)
- [ ] 1000 concurrent users, p99 latency < 2s, rolling score > 70 (stress)
- [ ] Redis cache hit rate > 80% on repeated analyses
- [ ] Queue backpressure handled (no dropped analyses)

### E2E (Playwright)
- [ ] Login (demo token) → upload diagram → status polls → ready → findings visible
- [ ] Invite member → role downgrade → actions disabled for viewer
- [ ] Export PDF downloads with charts
- [ ] Share link opens unauthenticated view
- [ ] Real-time presence (two browser tabs, presence indicator updates)
- [ ] Audit trail shows all actions with actor + timestamp

### Observability
- [ ] Correlation ID flows through all logs (upload → pipeline → findings)
- [ ] Sentry captures 5xx errors
- [ ] Prometheus metrics scraped (p99 latency, error rate, LLM calls)
- [ ] Grafana dashboard reflects SLAs (uptime, latency, score)

### Compliance
- [ ] HTTPS enforced; HSTS header present
- [ ] Rate limiting blocks auth brute-force (429 after N attempts)
- [ ] Audit log created for sensitive actions
- [ ] GDPR data export includes all user data
- [ ] No API keys in images/repo (.env gitignored)

---

## Critical Files for Implementation

**Backend:**
- `C:\archmind-ai\backend\app\services\pipeline.py` — rewrite with error handling, remove sleep, queue refactor
- `C:\archmind-ai\backend\app\routers\analyses.py` — exception-safe `_run_pipeline_task`, N+1 fix, audit logging, rate limiting
- `C:\archmind-ai\backend\app\models.py` — error columns, soft-delete, audit fields, indices, FailedAnalysis DLQ
- `C:\archmind-ai\backend\app\services\llm.py` — per-provider logging, LLM cache, verification pass, enhanced prompts
- `C:\archmind-ai\backend\app\services\scoring.py` (new) — ensemble, confidence, heuristic de-inflation
- `C:\archmind-ai\backend\app\services\patterns.py` (new) — real pattern detection
- `C:\archmind-ai\backend\app\observability.py` (new) — structured logging, correlation IDs
- `C:\archmind-ai\backend\app\routers\session.py` (new) — httpOnly cookie auth
- `C:\archmind-ai\backend\tests\conftest.py` — TestClient, auth fixtures (unlocks all API coverage)

**Frontend:**
- `C:\archmind-ai\src\lib\queryKeys.ts` (new) — centralized query key factory
- `C:\archmind-ai\src\hooks\queries.ts` (new) — custom query hooks
- `C:\archmind-ai\src\hooks\mutations.ts` (new) — custom mutation hooks
- `C:\archmind-ai\src\lib\api.ts` — add credentials/CSRF, typed bodies
- `C:\archmind-ai\src\contexts\AuthContext.tsx` — cookie session migration
- `C:\archmind-ai\src\pages\AnalysisDetail.tsx` — decompose into features/ + error boundary
- `C:\archmind-ai\src\App.tsx` — add routes, lazy loading, error boundaries
- `C:\archmind-ai\tsconfig.app.json` — enable strict mode

**Infrastructure:**
- `backend/Dockerfile` (update) — multi-stage, healthcheck, include alembic
- `backend/alembic/versions/` (new) — 3 migrations (2A/2B error columns, 2C indices+soft-delete, 2D DLQ)
- `k8s/` (new) — Deployment/Service/HPA/Ingress/ConfigMap/Secret yamls
- `.github/workflows/ci.yml` (new) — pytest/vitest/docker build gates
- `.github/workflows/deploy.yml` (new) — build→migrate→deploy staging→smoke→prod

---

## Effort Breakdown & Team Sizing

| Phase | Backend | Frontend | Infra | Total | Weeks |
|-------|---------|----------|-------|-------|-------|
| **1: Testing** | 4d | 3d | — | 7d | 1.5 |
| **2A: Observability** | 3d | — | — | 3d | 0.5 |
| **2B: Accuracy** | 5d | — | — | 5d | 1 |
| **2C: DB Safety** | 3d | — | — | 3d | 0.5 |
| **2D: Retry/DLQ** | 3d | — | — | 3d | 0.5 |
| **3: Frontend Refactor** | — | 8d | — | 8d | 2 |
| **3B: Collaboration** | 6d | 10d | — | 16d | 3 |
| **4: Infra & Observability** | 2d | — | 8d | 10d | 2 |
| **5: Security & Compliance** | 3d | 1d | 1d | 5d | 1 |
| **Integration & Testing** | 3d | 2d | 1d | 6d | 1 |
| **TOTAL** | **32d** | **24d** | **10d** | **66d** | **13** |

**Team:** 2 developers (1 backend-focused, 1 frontend-focused) + 1 DevOps engineer, working in parallel. Dense but realistic 3-month timeline.

---

## Success Criteria (End of Phase 5)

✅ >70 average architecture score (golden-set regression verified)
✅ p99 API latency < 2s under 1000 concurrent users (Locust validated)
✅ 99% uptime SLA (blue-green, alerting, RTO < 1h)
✅ Zero silent failures (Sentry + structured logs capture all errors)
✅ Team collaboration shipping (roles enforced, audit trail visible, invites working)
✅ Advanced exports (PDF + charts, Excel, Markdown TOC, custom reports)
✅ Real-time sync (WebSocket presence, version history, conflict resolution)
✅ Security baseline (HTTPS, CSRF, rate limiting, SOC 2 readiness, GDPR compliance)
✅ Test coverage (80% backend, 60% frontend, E2E happy paths)
✅ Observability (Prometheus metrics, Grafana dashboards, Sentry errors, Slack alerts)

---

## Launch Sequence

1. **Week 1–2:** Phase 1 (testing foundation) + Phase 2A (observability) in parallel.
2. **Week 3–4:** Phase 2B (accuracy) + Phase 2C (DB safety).
3. **Week 5–6:** Phase 2D (retry) + Phase 3 (frontend refactor begins).
4. **Week 7–9:** Phase 3 complete + Phase 3B (collaboration) kicks off.
5. **Week 10–12:** Phase 3B features ship + Phase 4 (infra) in parallel.
6. **Week 13:** Phase 5 (compliance) + final integration testing.
7. **Post-launch:** Monitoring active, metrics dashboard up, alerting configured, team trained.

---

**Next Step:** Proceed to execution once user approves this plan. Start with Phase 1 testing foundation in parallel with Phase 2A observability (both low-risk, foundational).
