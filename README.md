# ArchMind AI

> The AI Staff Architect for modern engineering teams. Design, review, optimize, and simulate production architectures with specialized AI agents, live cloud scanning, and DevOps configuration auditing.

---

## 🚀 Capabilities

ArchMind AI has been transformed from an architecture reviewer into a comprehensive architecture lifecycle platform:

### 1. AI Architecture Generator
- **Natural Language Intake**: Describe a system (e.g., *"Design an e-commerce platform for 10 million users"*) in plain English.
- **Artifact Generation**: Automatically creates a structured Mermaid diagram, a detailed tech stack recommendation, database choices with scale rationale, an API gateway strategy, and a CDN setup.
- **DevOps Bootstrapping**: Automatically outputs ready-to-run Kubernetes deployment manifests and Terraform VPC/resource starter configuration files.

### 2. Architecture Copilot
- **Context-Aware Assistance**: Chat with an assistant that holds complete knowledge of your architecture components, connections, and analysis findings.
- **Engineering Q&A**: Resolves performance bottlenecks, details failures impact (*"What happens if Redis fails?"*), models component removal consequences (*"Can I remove Kafka?"*), and projects resource budgets.

### 3. Simulation & Resilience Suite
- **Traffic Load Projection**: Simulates latency (p50/p95/p99), monthly budgets, and autoscalingVM thresholds across 1K, 100K, 1M, 10M, and 100M user tiers.
- **Chaos Failure Simulator**: Crash any architectural component to trace downstream cascade failure paths, estimate recovery MTTR, and check defensive postures (circuit breakers, retries).
- **Knowledge Graph**: Recursively audits upstream and downstream dependency networks to score service centrality and compute system impact percentages.

### 4. Optimize & Compliance
- **One-Click Redesigns**: Optimizes designs across 6 specific blueprints (Cost Optimized, Performance Optimized, High Availability, Enterprise Scale, Startup MVP, Multi-Region) with side-by-side comparative charts.
- **Regulatory Readiness Auditing**: Scores compliance status and lists outstanding gaps for SOC 2, ISO 27001, GDPR, HIPAA, and PCI DSS.
- **AI Pair Architect**: Iteratively co-design topologies via chat while viewing live diagram updates and suggested design questions.

### 5. DevOps, IaC & API Auditing
- **Infrastructure Audits**: Scans Terraform configurations, Kubernetes YAML, and Docker Compose configurations for exposed keys, privileged containers, missing limits, or restart policies.
- **API Spec Audits**: Reviews OpenAPI/Swagger specifications for path prefixes versioning, authentication standards, and error payloads consistency.
- **Database Index Optimizations**: Audits SQL DDL schemas to identify missing foreign key lookup indexes, tables primary key constraints, and partitioning opportunities.
- **CI/CD Integrations**: Hook PR webhooks into code repositories to automatically execute these security audits on every commit, generating formatted markdown review comments.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI, Lucide Icons, Recharts, React Flow
- **Backend**: FastAPI (Python 3.12+), SQLAlchemy (SQLite/PostgreSQL support), JWT Authentication
- **AI Engine**: 7 specialized agents (Scalability, Security, Reliability, Performance, Cost, Maintainability, Observability) + 6 LLM provider fallbacks (Groq, NVIDIA, OpenRouter, Gemini, Ollama, HuggingFace) with rule-based heuristics.

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.12+)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up environment variables in a `.env` file:
   ```env
   DATABASE_URL=sqlite:///./archmind.db
   DEV_MODE=True
   DEV_JWT_SECRET=your-secure-secret-key
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Install npm dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

---

## 🤖 Webhook PR Review Integration

Expose your webhook to code repositories:
- **Endpoint URL**: `POST /api/analyses/integrations/webhook/github`
- **Payload Format**: Standard GitHub pull request webhook format or custom JSON file reviews:
  ```json
  {
    "action": "opened",
    "pull_request": { "number": 1 },
    "changed_files": [
      {
        "filename": "infrastructure/main.tf",
        "content": "... Terraform code ..."
      }
    ]
  }
  ```
Test webhook audits directly in the app under **Team &gt; CI/CD Webhooks**.
