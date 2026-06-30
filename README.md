# ArchMind AI

> AI-powered architecture intelligence platform. Upload diagrams, run 7-agent reviews, compare versions, and chat with findings — powered by free-tier LLMs, no API key required.

## Key metrics

| Metric | Value |
|--------|-------|
| Analysis time | ~3–4 min (LLM) or ~30 s (heuristic) |
| Agents per analysis | 7 specialized reviewers |
| Free LLM providers | 6 (plus OpenAI-compatible) |
| Diagram formats | Mermaid, PlantUML, PNG, JPG, PDF, SVG, Draw.io |
| Export formats | Markdown, JSON, HTML |

## Features

- **Upload / paste / URL intake** — drag-drop files, paste Mermaid/PlantUML code, or import from a URL
- **7-agent analysis pipeline** — each agent evaluates a specific dimension:

  | Agent | Focus |
  |-------|-------|
  | Scalability | Horiztonal/vertical scaling, load balancing, stateless design |
  | Security | Auth, encryption, network segmentation, secret management |
  | Reliability | Redundancy, retries, circuit breakers, failover, SLAs |
  | Performance | Caching, connection pooling, async processing, CDN usage |
  | Cost | Waste analysis, reserved capacity, serverless vs. containers |
  | Maintainability | Coupling, observability, documentation, change management |
  | Observability | Logging, metrics, tracing, alerting, dashboards |

- **Interactive diagram viewer** — React Flow with pan/zoom, click-to-filter findings by component
- **Architecture-aware chat** — ask questions about your architecture, agents prepopulate context
- **Compare mode** — side-by-side analysis comparison with per-agent score deltas
- **Workspaces** — team collaboration with role-based access (owner/editor)
- **Export reports** — Markdown, JSON, or HTML for sharing and documentation
- **LLM fallback chain** — if one provider is rate-limited, the next automatically takes over
- **Heuristic fallback** — when no LLM is configured, a rule-based engine still produces useful results

## Tech stack

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | React 18, TypeScript 5.8 |
| Build | Vite 5, SWC |
| Routing | React Router DOM v6 |
| Data | TanStack Query v5 |
| Styling | Tailwind CSS 3.4 |
| Components | Shadcn UI (Radix primitives) |
| Diagrams | React Flow v11 (xyflow) |
| Charts | Recharts v2 |
| Animation | Framer Motion v12 |
| Forms | React Hook Form + Zod |
| Carousel | Embla |
| Icons | Lucide |
| Testing | Vitest + Testing Library |

### Backend

| Layer | Choice |
|-------|--------|
| Framework | FastAPI 0.115, Python 3.12 |
| ORM | SQLAlchemy 2.0 |
| Auth | python-jose (JWT) + Supabase |
| Server | Uvicorn 0.32 |
| Validation | Pydantic v2 |
| Image processing | PyMuPDF (fitz) |
| Testing | Pytest 8.2 |
| Containers | Docker + docker compose |

### Infrastructure

| Component | Dev | Production |
|-----------|-----|------------|
| Database | SQLite | PostgreSQL / Supabase |
| Auth | Demo email login | Supabase Auth |
| API server | Uvicorn (hot reload) | Uvicorn (container) |
| Frontend | Vite dev server (port 8080) | Vite build (static) |

## Quick start

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm (or bun)

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# Edit backend/.env if needed (defaults work for local dev)
python run.py
```

API runs at **http://localhost:8000** — verify:

```bash
curl http://localhost:8000/api/health
# {"status":"ok","service":"archmind-api"}
```

### 2. Frontend

```bash
# From project root
npm install
npm run dev
```

App runs at **http://localhost:8080** (Vite proxies `/api` to the backend).

### 3. Sign in

- **Local dev (no Supabase):** Use any email + password (6+ chars) — the backend stores no password, just creates a profile
- **Supabase mode:** Configure `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env` and `SUPABASE_JWT_SECRET` + `DATABASE_URL` in `backend/.env`

### 4. Run your first analysis

1. Click **New Analysis** on the dashboard
2. Paste a Mermaid diagram or upload an image
3. Wait ~2–4 minutes while the 7 agents review your architecture
4. Review findings, filter by component, export or share the report

## LLM provider setup (optional)

The heuristic engine works without any API keys. For LLM-powered analysis, configure any of these in `backend/.env`:

| Provider | Env var | Free tier |
|----------|---------|-----------|
| Groq | `GROQ_API_KEY` | 30 req/s |
| NVIDIA NIM | `NVIDIA_API_KEY` | Credits |
| OpenRouter | `OPENROUTER_API_KEY` | Many free models |
| Gemini | `GEMINI_API_KEY` | Free tier |
| Ollama (local) | `OLLAMA_BASE_URL` | No key needed |
| HuggingFace | `HF_API_KEY` | Free tier |
| OpenAI-compatible | `OPENAI_API_KEY` + `OPENAI_BASE_URL` | Varies |

Set priority order with `LLM_PROVIDER_ORDER` (default: `groq,nvidia,openrouter,gemini,ollama,huggingface`).

## Docker

```bash
docker compose up --build
```

Starts PostgreSQL 16 + the API server. Frontend runs separately via `npm run dev`.

## Production (Supabase)

1. Create a [Supabase](https://supabase.com) project
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Enable auth providers in Supabase Dashboard → Authentication → Providers
4. Set environment variables:

```bash
# Frontend .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-api.example.com

# Backend .env
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
SUPABASE_JWT_SECRET=your-jwt-secret
CORS_ORIGINS=https://your-app.example.com
DEV_MODE=false
```

## API reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/demo-login` | — | Demo email login (dev only) |
| GET | `/api/auth/me` | Bearer | Current user profile |

### Analyses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analyses` | Bearer | List analyses (`?q=` search) |
| POST | `/api/analyses` | Bearer | Create from paste/URL |
| POST | `/api/analyses/upload` | Bearer | Create from file (multipart) |
| GET | `/api/analyses/{id}` | Bearer | Analysis detail + findings |
| POST | `/api/analyses/{id}/chat` | Bearer | Send chat message |
| GET | `/api/analyses/{id}/chat` | Bearer | Get chat history |
| GET | `/api/analyses/{id}/export/{fmt}` | Bearer | Export (json/markdown/html) |
| GET | `/api/analyses/agents/meta` | Bearer | List agent metadata |
| GET | `/api/analyses/{id}/agents/{key}` | Bearer | Per-agent report |

### Workspaces

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces` | Bearer | User workspaces |
| GET | `/api/workspaces/{id}/members` | Bearer | Workspace members |
| GET | `/api/dashboard/stats` | Bearer | Dashboard metrics |

### Meta

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/meta/llm` | — | LLM provider status |
| GET | `/api/health` | — | Health check |

## Scripts

### Frontend (package.json)

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest
npm run preview      # Preview production build
```

### Backend

```bash
python run.py                          # Start dev server (port 8000)
python scripts/verify_llm.py           # Test LLM provider connectivity
pytest                                 # Run tests
```

## Project structure

```
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routes
│   │   ├── config.py          # Pydantic settings
│   │   ├── database.py        # SQLAlchemy engine, session, init
│   │   ├── models.py          # ORM models (6 tables)
│   │   ├── schemas.py         # Request/response schemas
│   │   ├── auth.py            # JWT + Supabase auth
│   │   ├── routers/           # API route handlers
│   │   ├── services/          # LLM, agents, pipeline, diagram
│   │   └── tests/             # Backend tests
│   ├── Dockerfile
│   └── requirements.txt
├── src/
│   ├── components/            # React components
│   ├── contexts/              # React context providers
│   ├── hooks/                 # Custom hooks
│   ├── layouts/               # App shell layouts
│   ├── lib/                   # API client, types, utils
│   ├── pages/                 # Route page components
│   └── test/                  # Frontend tests
├── supabase/migrations/       # DB schema + RLS policies
├── docker-compose.yml
├── vite.config.ts
└── package.json
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design, data flow, and component diagrams.

## Roadmap

### H2 2026

| Quarter | Focus | Deliverables |
|---------|-------|-------------|
| Q2 | Platform foundation | Multi-workspace management, Team invite flow, Custom agent prompts |
| Q3 | Analysis engine + integrations | Streaming results, PDF reports, Analysis templates, GitHub Actions CI, Slack notifications |
| Q4 | AI capabilities | RAG on past analyses, Multi-model cross-validation, Architecture copilot (alpha), Admin dashboard |

### H1 2027

| Quarter | Focus | Deliverables |
|---------|-------|-------------|
| Q1 | Advanced AI + infrastructure | Incremental reanalysis, Architecture copilot (GA), Automated remediation PRs (beta), Async worker pool |
| Q2 | Compliance + platform | Automated remediation PRs (GA), Audit log, SOC 2 / GDPR documentation |

```mermaid
gantt
  title ArchMind AI Roadmap
  dateFormat YYYY-MM
  axisFormat %Y-%m

  section Platform
  Workspaces: 2026-03, 2026-06
  Team invites: 2026-05, 2026-08
  Custom prompts: 2026-06, 2026-09

  section Engine
  Streaming: 2026-07, 2026-10
  PDF reports: 2026-08, 2026-10
  Templates: 2026-09, 2026-11
  Reanalysis: 2026-10, 2027-01

  section Integrations
  GitHub Actions: 2026-06, 2026-09
  Slack: 2026-07, 2026-10
  API tokens: 2026-08, 2026-11
  Webhooks: 2026-09, 2026-11

  section AI
  RAG: 2026-08, 2026-12
  Multi-model: 2026-09, 2027-01
  Copilot: 2026-10, 2027-03
  Auto PRs: 2026-12, 2027-04

  section Infra
  CICD: 2026-05, 2026-07
  Logging: 2026-06, 2026-08
  Migrations: 2026-05, 2026-07
  Workers: 2026-07, 2026-10

  section Admin
  Dashboard: 2026-08, 2026-11
  Audit: 2026-09, 2026-12
  SOC2: 2026-10, 2027-01
```

## Development

### Architecture alignment

```mermaid
flowchart LR
  subgraph Frontend
    Vite[Vite Dev Server :8080]
    React[React SPA]
    RF[React Flow Viewer]
    RC[Recharts Dashboard]
  end

  subgraph Backend
    API[FastAPI :8000]
    AUTH[AJWT + Supabase Auth]
    PL[Pipeline Orchestrator]
    LLM[LLM Provider Abstraction]
    HEUR[Heuristic Engine]
    DB[("SQLite / PostgreSQL")]
  end

  subgraph External
    SUP[Supabase Auth]
    LLMP[LLM Providers - Groq / NVIDIA / etc.]
  end

  Vite -- proxy /api --> API
  React --> Vite
  API --> AUTH
  API --> PL
  PL --> LLM
  LLM --> LLMP
  PL --> HEUR
  API --> DB
  AUTH --> SUP
```

### Future architecture vision

```mermaid
flowchart TB
  subgraph Client
    WEB[Web App - React + Vite]
    CLI["CLI / CI Plugin"]
  end

  subgraph Gateway
    ALB["ALB / API Gateway"]
    WAF["WAF + Rate Limiter"]
  end

  subgraph Services
    API[API Server, FastAPI + Uvicorn]
    WK[Background Worker, Celery / Arq]
    CACHE[(Redis, Cache + Queue)]
  end

  subgraph Storage
    PG[(PostgreSQL, Supabase)]
    OBJ[(Object Store, S3-compatible)]
  end

  subgraph Observability
    LOG[Structured Logging, OpenTelemetry]
    MET[Metrics + Alerts, Prometheus + Grafana]
  end

  subgraph AI
    LLMG[LLM Gateway, Provider Router]
    VEC[(Vector Store, pgvector)]
    AGT[Agent Runtime, LangChain / Custom]
  end

  WEB --> ALB
  CLI --> ALB
  ALB --> WAF
  WAF --> API
  API --> WK
  WK --> CACHE
  API --> CACHE
  API --> PG
  WK --> PG
  API --> OBJ
  WK --> OBJ
  API --> LLMG
  WK --> LLMG
  LLMG --> AGT
  AGT --> VEC
  API -.-> LOG
  API -.-> MET
  WK -.-> LOG
  WK -.-> MET
```

## License

ArchMind AI is provided under a proprietary license. Contact the maintainers for commercial use terms.
