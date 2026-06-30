# ArchMind AI — Architecture

## System overview

```mermaid
flowchart TB
  subgraph Browser["Browser (port 8080)"]
    SPA["React SPA, Vite dev / build"]
    RF["React Flow Viewer, xyflow/v11"]
    RC["Recharts Dashboard"]
  end

  subgraph API["API Server (port 8000)"]
    FA["FastAPI Application"]
    MW["Middleware Stack, CORS → Exception → Routing"]
    AUTH["Auth Dependencies, JWT decode → Profile → Workspace"]
  end

  subgraph Routers["Route Handlers"]
    R_AUTH["auth.py, /api/auth"]
    R_ANAL["analyses.py, /api/analyses"]
    R_WS["workspaces.py, /api/workspaces"]
    R_META["meta.py, /api/meta"]
  end

  subgraph Services["Service Layer"]
    PIPELINE["pipeline.py, Analysis Orchestrator"]
    AGENTS["agents.py, 7-Agent Engine"]
    LLM["llm.py, Provider Abstraction, 6 fallback providers"]
    DIAGRAM["diagram.py, Mermaid / PlantUML Parser"]
    RENDER["render.py, PDF/SVG → PNG"]
  end

  subgraph Storage["Persistence"]
    DB[("SQLite / PostgreSQL, SQLAlchemy 2.0")]
    FS[("Uploads, Local filesystem")]
  end

  subgraph External["External"]
    SUPABASE["Supabase, Auth + optional DB"]
    LLMPROV["LLM Providers, Groq / NVIDIA / OpenRouter, Gemini / Ollama / HuggingFace"]
  end

  SPA -->|"HTTP (proxied)"| FA
  FA --> MW
  MW --> Routers
  Routers --> AUTH
  R_AUTH --> SUPABASE
  R_ANAL --> Services
  R_WS --> DB
  R_META --> LLM
  Services --> DB
  Services --> FS
  PIPELINE --> AGENTS
  PIPELINE --> DIAGRAM
  PIPELINE --> RENDER
  AGENTS --> LLM
  LLM --> LLMPROV
```

## Frontend architecture

```mermaid
flowchart TB
  subgraph Entry
    main["main.tsx, ReactDOM.createRoot"]
    App["App.tsx, BrowserRouter + Providers"]
  end

  subgraph Providers["Context Providers"]
    QP["QueryClientProvider, TanStack Query"]
    AP["AuthProvider, AuthContext"]
    TP["ThemeProvider"]
  end

  subgraph Layout["Layout"]
    AL["AppLayout.tsx, Sidebar + Header + Main"]
    PR["ProtectedRoute.tsx, Auth guard → /login"]
  end

  subgraph Pages["Pages"]
    LANDING["Landing.tsx, Marketing page"]
    LOGIN["Login.tsx → AuthShell"]
    SIGNUP["Signup.tsx → AuthShell"]
    DASH["Dashboard.tsx, Stats + Recent + Chart"]
    UPLOAD["Upload.tsx, File / Paste / URL"]
    ANAL["Analyses.tsx, List table with scores"]
    DETAIL["AnalysisDetail.tsx, Flow viewer + Findings + Chat"]
    REPORT["AgentReport.tsx, Per-agent deep dive"]
    COMPARE["Compare.tsx, Side-by-side delta"]
    WS["Workspaces.tsx, Team management"]
    SETT["Settings.tsx, Profile / Notifications / Integrations"]
    BILL["Billing.tsx, Plan + usage"]
  end

  subgraph Shared["Shared"]
    UI["ui/, 30+ Shadcn components"]
    HOOKS["hooks/, use-mobile, use-toast"]
    LIBS["lib/, api.ts, supabase.ts, types.ts"]
    CTX["contexts/AuthContext.tsx"]
  end

  main --> App
  App --> QP
  QP --> AP
  AP --> TP
  TP --> Layout
  Layout --> Pages
  Pages --> Shared
```

## Route structure

```mermaid
flowchart LR
  ROOT["/"] --> LANDING["Landing page"]
  ROOT --> LOGIN["/login"]
  ROOT --> SIGNUP["/signup"]
  ROOT --> PRICING["/pricing"]

  ROOT --> PROTECTED["ProtectedRoute"]

  PROTECTED --> DASH["/dashboard"]
  PROTECTED --> UPLOAD["/upload"]
  PROTECTED --> ANAL["/analyses"]
  ANAL --> DETAIL["/analyses/:id"]
  DETAIL --> REPORT["/analyses/:id/agents/:key"]
  PROTECTED --> COMPARE["/compare"]
  PROTECTED --> WS["/workspaces"]
  PROTECTED --> SETT["/settings"]
  PROTECTED --> BILL["/billing"]

  ROOT --> CATCH["/* → NotFound"]
```

## Backend architecture

```mermaid
flowchart TB
  subgraph FastAPI["FastAPI Application"]
    LIFESPAN["lifespan, init_db() → create_all"]
    CORS["CORSMiddleware, allow_origins from settings"]
    EXC["ExceptionMiddleware"]
    ROUTER["Router mount, /api/auth, /api/analyses, /api/workspaces, /api/meta"]
  end

  subgraph DI["Dependency Injection"]
    HTTPB["HTTPBearer, auto_error=False"]
    GETUSER["get_current_user, decode_token → profile → workspace"]
    GETDB["get_db, SessionLocal → yield → close"]
  end

  subgraph Auth["Authentication"]
    JWT["create_access_token, HS256 signed"]
    DECODE["decode_token, Asymmetric → JWKS, Symmetric → JWT secret"]
    JWKS_CACHE["_JWKS_CACHE, kid → JWK dict"]
    PROFILE["get_or_create_profile, get/insert Profile row"]
    WORKSPACE["ensure_default_workspace, create Workspace + Membership"]
  end

  subgraph Config["Configuration (pydantic-settings)"]
    SETTINGS["Settings, database_url, cors_origins, supabase_*, dev_*, llm_*"]
  end

  FastAPI --> DI
  FastAPI --> Config
  DI --> GETUSER
  GETUSER --> Auth
  Auth --> SETTINGS
```

## Database schema

```mermaid
erDiagram
    profiles {
        str id PK "UUID"
        str email UK "User email"
        str full_name "Nullable"
        str avatar_url "Nullable"
        str plan "hobby | team | enterprise"
        int analyses_used
        int analyses_limit
        datetime created_at
    }

    workspaces {
        str id PK "UUID"
        str name
        str slug UK
        str plan
        datetime created_at
    }

    workspace_members {
        str id PK "UUID"
        str workspace_id FK
        str user_id FK
        str role "owner | editor"
    }

    analyses {
        str id PK "UUID"
        str workspace_id FK
        str author_id FK
        str name
        str source_type "paste | upload | url"
        str diagram_type "Nullable"
        str status "queued | analyzing | ready | failed"
        str file_path "Nullable"
        text source_content "Nullable"
        json scores
        json diagram_nodes
        json diagram_edges
        datetime created_at
        datetime updated_at
    }

    findings {
        str id PK "UUID"
        str analysis_id FK
        str agent "scalability | security | ..."
        str severity "low | medium | high | critical"
        str title
        text summary
        text recommendation
        str node_id "Nullable"
    }

    chat_messages {
        str id PK "UUID"
        str analysis_id FK
        str user_id FK "Nullable"
        str role "user | assistant"
        text content
        datetime created_at
    }

    profiles ||--o{ analyses : "authors"
    profiles ||--o{ workspace_members : "has"
    workspaces ||--o{ analyses : "contains"
    workspaces ||--o{ workspace_members : "has"
    analyses ||--o{ findings : "has"
    analyses ||--o{ chat_messages : "has"
    workspace_members }o--|| profiles : "belongs to"
    workspace_members }o--|| workspaces : "belongs to"
```

## Auth flow

```mermaid
sequenceDiagram
    actor User
    participant SPA as React SPA
    participant Supa as Supabase Auth
    participant API as FastAPI Backend
    participant DB as Database

    alt Supabase Mode (production)
        User->>SPA: Enter email + password
        SPA->>Supa: supabase.auth.signInWithPassword()
        Supa-->>SPA: Session (access_token JWT)
        SPA->>API: GET /api/auth/me, Authorization: Bearer <JWT>
        API->>API: decode_token()
        alt Asymmetric JWT (ES256/RS256)
            API->>Supa: Fetch JWKS from /.well-known/jwks.json
            Supa-->>API: Public keys
            API->>API: Verify JWT signature
        else Symmetric JWT (HS256)
            API->>API: Verify with SUPABASE_JWT_SECRET
        end
        API->>DB: get_or_create_profile(user_id, email)
        API->>DB: ensure_default_workspace(profile)
        DB-->>API: Profile + Workspace
        API-->>SPA: Profile JSON
    else Demo Mode (local dev)
        User->>SPA: Enter email + password
        SPA->>API: POST /api/auth/demo-login
        Note over API: verify DEV_MODE=true
        API->>API: uuid5(email) → user_id
        API->>DB: get_or_create_profile(user_id, email)
        DB-->>API: Profile
        API->>API: create_access_token() → HS256 JWT
        API-->>SPA: { access_token, user }
    end

    SPA->>SPA: Store token in localStorage
    SPA->>API: Subsequent requests with Bearer token
```

## Analysis pipeline

```mermaid
sequenceDiagram
    participant User
    participant SPA as React SPA
    participant API as FastAPI
    participant Parser as Diagram Parser
    participant LLM as LLM Provider
    participant Heur as Heuristic Engine
    participant DB as Database

    User->>SPA: Upload / paste / URL
    SPA->>API: POST /api/analyses or /upload

    API->>DB: Insert analysis (status=queued)
    API-->>SPA: Analysis summary (202 Accepted)

    API->>API: Background task starts
    API->>DB: Update status=analyzing

    alt Text diagram (Mermaid / PlantUML)
        API->>Parser: parse_mermaid() / parse_plantuml()
        Parser-->>API: nodes[], edges[]
    else Image diagram (PNG / PDF / SVG)
        API->>API: render_to_png()
        API->>LLM: llm_vision_extract_graph()
        LLM-->>API: nodes[], edges[]
    else Unknown / blank
        API->>API: Return sample default graph
    end

    alt LLM provider configured
        par Agent 1 to 7
            API->>LLM: llm_agent_analyze(agent_prompt, nodes, edges)
            LLM-->>API: { findings[], score }
        end
    else No LLM
        API->>Heur: run heuristic rules (18+ rules)
        Heur-->>API: { findings[], score }
    end

    API->>DB: Clear old findings
    API->>DB: Insert new findings + scores + diagram
    API->>DB: Update status=ready, increment analyses_used

    SPA->>API: GET /api/analyses/{id} (polling)
    API-->>SPA: Analysis with findings & diagram
    SPA->>SPA: Render React Flow viewer + score cards + findings table
```

## LLM provider chain

```mermaid
flowchart LR
    A["analysis request"] --> B["LLM Provider Order, groq,nvidia,openrouter,gemini,ollama,huggingface"]

    B --> C{"groq configured?"}
    C -->|Yes| D["try groq, llama-3.3-70b-versatile"]
    D -->|"success"| Z["return result"]
    D -->|"rate-limit / error"| E

    C -->|No| E{"nvidia configured?"}
    E -->|Yes| F["try nvidia, meta/llama-3.3-70b-instruct"]
    F -->|success| Z
    F -->|error| G

    E -->|No| G{"openrouter configured?"}
    G -->|Yes| H["try openrouter, meta-llama/llama-3.3-70b-instruct:free"]
    H -->|success| Z
    H -->|error| I

    G -->|No| I{"gemini configured?"}
    I -->|Yes| J["try gemini, gemini-2.0-flash"]
    J -->|success| Z
    J -->|error| K

    I -->|No| K{"ollama configured?"}
    K -->|Yes| L["try ollama, qwen2.5:7b"]
    L -->|success| Z
    L -->|error| M

    K -->|No| M{"huggingface configured?"}
    M -->|Yes| N["try huggingface, Mixtral-8x7B"]
    N -->|success| Z
    N -->|error| O

    M -->|No| O["heuristic fallback, 18 rule-based checks"]

    O --> Z
```

## 7-agent analysis dimensions

```mermaid
mindmap
  root((ArchMind Agents))
    Scalability
      Horizontal scaling
      Load balancing
      Stateless design
      Database sharding
      Auto-scaling config
    Security
      Authentication & authorization
      Encryption (in-transit / at-rest)
      Network segmentation
      Secrets management
      Input validation
    Reliability
      Redundancy & failover
      Retries & circuit breakers
      Health checks
      Disaster recovery
      SLA attainment
    Performance
      Caching strategy
      Connection pooling
      Async processing
      CDN usage
      Bottleneck detection
    Cost
      Resource right-sizing
      Reserved vs on-demand
      Waste identification
      Storage tiering
      Serverless economics
    Maintainability
      Coupling & cohesion
      Observability readiness
      Documentation coverage
      CI/CD maturity
      Change management
    Observability
      Logging structure
      Metrics & dashboards
      Distributed tracing
      Alerting rules
      SLI / SLO definitions
```

## Data flow: upload to report

```mermaid
flowchart TB
    U["User uploads diagram"] --> P["POST /api/analyses/upload"]
    P --> Q["Queue (status=queued)"]
    Q --> A["Analyze (status=analyzing)"]

    subgraph Parse["Parse phase"]
        direction LR
        FP["File type detection"] --> R1["Render PDF/SVG → PNG"]
        FP --> R2["Extract text (Mermaid/PlantUML)"]
    end

    A --> Parse

    subgraph Agent["Agent phase"]
        S1["Scalability Agent"]
        S2["Security Agent"]
        S3["Reliability Agent"]
        S4["Performance Agent"]
        S5["Cost Agent"]
        S6["Maintainability Agent"]
        S7["Observability Agent"]

        S1 --> C["Score aggregation"]
        S2 --> C
        S3 --> C
        S4 --> C
        S5 --> C
        S6 --> C
        S7 --> C
    end

    Parse --> Agent
    C --> R["Ready (status=ready), findings + scores + diagram"]

    R --> E["Export JSON / MD / HTML"]
    R --> V["React Flow viewer"]
    R --> T["Chat (context-aware)"]
    R --> Comp["Compare (delta view)"]
```

## Deployment architecture

```mermaid
flowchart LR
    subgraph Dev["Local Development"]
        V["Vite Dev Server, port 8080"]
        U["Uvicorn Hot Reload, port 8000"]
        SQL["SQLite, archmind.db"]
    end

    subgraph Docker["Docker Compose"]
        API["API Container, Python 3.12-slim, Uvicorn :8000"]
        PG["PostgreSQL 16 Alpine, :5432"]
    end

    subgraph Prod["Production (Supabase)"]
        SPA["Static SPA, Vite build → CDN"]
        FAPI["FastAPI Container, Cloud Run / ECS / AKS"]
        SUP["Supabase, Auth + Postgres"]
    end

    Dev --> Docker
    Docker --> Prod
```

## Key design decisions

| Decision | Rationale |
|----------|-----------|
| **7 independent agents** over a single monolithic prompt | Each agent specializes; failures are isolated; scores are independently computed |
| **Provider fallback chain** over hard dependency on one LLM | No single point of failure; free tiers can be rate-limited; users choose their comfort level |
| **Heuristic fallback** over requiring an LLM | Zero-config onboarding; works in air-gapped environments; provides baseline value immediately |
| **Stateless JWT** over sessions | Simple to implement; no server-side session store; works with horizontal scaling |
| **BackgroundTasks** over a separate worker queue | Minimal infrastructure for MVP; avoids Redis/RabbitMQ dependency; trade-off is no retry on crash |
| **SQLAlchemy** with SQLite + PostgreSQL support | Devs use SQLite locally (zero setup); production uses PostgreSQL (Supabase managed) |
| **Regex-based diagram parser** over full grammar parser | Good enough for 90% of user diagrams; avoids ANTLR/Tree-sitter dependency; fast to execute |
| **Vite proxy** over separate API domain in dev | Eliminates CORS issues in development without proxy config; one URL for the whole app |
