# Chat with Your Data (Text-to-SQL Analytics Platform)

An enterprise-grade Business Intelligence and natural language data analytics engine. Ingests structured CSV and Excel files into PostgreSQL, allows users to ask analytical questions in Persian and English, executes queries within an isolated database sandbox, and generates interactive visualizations.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Multi-Layer Database Sandbox & Security Model](#multi-layer-database-sandbox--security-model)
3. [Data Ingestion Pipeline & Semantic Layer](#data-ingestion-pipeline--semantic-layer)
4. [Query Execution & Self-Healing Loop](#query-execution--self-healing-loop)
5. [Visualization & Dashboard System](#visualization--dashboard-system)
6. [REST API Specification](#rest-api-specification)
7. [Environment Configuration](#environment-configuration)
8. [Local Development & Quickstart](#local-development--quickstart)
9. [Automated Testing & Security Verification](#automated-testing--security-verification)
10. [Repository Directory Structure](#repository-directory-structure)
11. [Production Deployment & Operational Hardening](#production-deployment--operational-hardening)

---

## Architecture Overview

The system is architected as an ECMAScript monorepo with strict decoupling between presentation, business logic, data persistence, and isolated execution sandboxes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (React 19)                             │
│   Vite 8 • Tailwind CSS v4 • Recharts 3 • Framer Motion 14              │
│   • Auto-RTL / Persian Typography Engine • Interactive Dashboard Grid   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / JSON (HttpOnly Cookies)
┌────────────────────────────────────▼────────────────────────────────────┐
│                          API Gateway (Express 5)                        │
│   Node.js 22 (ESM) • Subpath Imports • Zod Validation • Pino Logger     │
│   • Scrypt Auth • Streaming Ingestion • Schema Generator                │
└──────────────────┬──────────────────────────────────┬───────────────────┘
                   │ adminPool                        │ agentPool
                   │ (System Catalog)                 │ (Read-Only Execution)
┌──────────────────▼──────────────────┐  ┌─────────────▼──────────────────┐
│        PostgreSQL: app Schema       │  │   PostgreSQL: Sandbox Schemas  │
│  Users, Sessions, Datasets Catalog, │  │   Schema: sbx_<user_id>        │
│  Semantic Layer Metadata, Pins      │  │   Role: sbx_<user_id>_reader   │
└─────────────────────────────────────┘  └────────────────────────────────┘
```

### Key Technical Specifications
* **Frontend**: React 19, Vite 8, Tailwind CSS v4, Recharts 3, Framer Motion 14, Lucide React.
* **Backend**: Node.js 22 (ESM native), Express 5, Zod 4, Pino 10, ExcelJS, Csv-Parser, node-postgres (`pg` 8).
* **Database**: PostgreSQL 16+ utilizing role-level privileges, schema segregation, and connection pooling.

---

## Multi-Layer Database Sandbox & Security Model

Allowing arbitrary or AI-generated SQL execution requires defense-in-depth security. The platform implements four orthogonal protection layers:

```
                  Untrusted / AI-Generated Query
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Pre-Flight Lexical SQL Guard (sqlGuard.js)             │
│ • Rejects empty, multi-statement, or oversized (>10k chars) SQL │
│ • Validates leading keyword (SELECT or WITH only)               │
│ • Strips comments, strings, and dollar-quotes via finite scanner│
│ • Blocks system calls (set_config, pg_sleep, pg_read_file, etc.)│
└────────────────────────────────┬────────────────────────────────┘
                                 │ Pass
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Dedicated Unprivileged Role (readonly_agent)           │
│ • Connects via agentPool                                        │
│ • Zero default privileges; cannot access 'app' system schema    │
│ • Cannot create temporary tables or modify server configuration │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Acquire client
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Ephemeral Transaction Sandbox (sandboxExecutor.js)     │
│ • BEGIN TRANSACTION READ ONLY (disallows any DML/DDL)           │
│ • SET LOCAL ROLE sbx_<user_id>_reader (per-user reader role)    │
│ • SET LOCAL search_path TO sbx_<user_id> (tenant namespace only)│
│ • SET LOCAL statement_timeout = 5000 (aborts runaway queries)   │
│ • ALWAYS ROLLBACK (guarantees zero session state leakage)       │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Query Output
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Server-Side Result Capping & Formatting                │
│ • Wraps execution in sub-select: SELECT * FROM (...) AS _res    │
│ • Caps result set at maxRows (default: 500)                     │
│ • Prevents out-of-memory errors from unbounded joins            │
└─────────────────────────────────────────────────────────────────┘
```

### Security Boundary Comparison

| Vector | Mitigating Layer | Mechanism |
| :--- | :--- | :--- |
| **SQL Injection (DDL/DML)** | Layers 1, 2, 3 | Static AST check + `READ ONLY` transaction + `SELECT`-only privileges. |
| **Cross-Tenant Snooping** | Layers 2, 3 | Isolated schema (`sbx_<id>`) and unique reader role per user. |
| **Denial of Service (CPU)** | Layer 3 | Hard statement timeout (`5000ms`) via PostgreSQL engine. |
| **Out-of-Memory (Memory)** | Layer 4 | Server-side pagination & row truncation limit (`500` rows). |
| **Privilege Escalation** | Layers 1, 2, 3 | Revoked `set_config` and system function blacklisting. |

---

## Data Ingestion Pipeline & Semantic Layer

The data pipeline handles unstructured CSV and XLSX files, converting raw files into physical relational tables:

```
Uploaded File (.csv / .xlsx)
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Streaming Parser (fileParser.js)                             │
│ • CSV: Fast streaming parser with UTF-8 BOM auto-detection     │
│ • XLSX: Streamed workbook iterator via ExcelJS                  │
│ • Memory footprint stays constant regardless of file size       │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Headers & Sample Rows
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Identifier Sanitization (columnSanitizer.js)                 │
│ • Converts headers to lowercase snake_case ([a-z_][a-z0-9_]*)   │
│ • Transliterates Persian/Arabic characters to ASCII equivalents │
│ • Prefixes PostgreSQL reserved keywords (select -> col_select)  │
│ • Resolves duplicate column names (col, col_2, col_3)           │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Cleaned Identifiers
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Automated Type Inference (typeInference.js)                  │
│ • Samples data rows across columns                              │
│ • Detects integers, bigints (>2^31-1), numerics (currency/dots) │
│ • Identifies dates (YYYY-MM-DD), ISO timestamps (timestamptz)   │
│ • Supports boolean literals ('true', 'false', 'بله', 'خیر')     │
│ • Falls back to 'text' for mixed or unparseable columns         │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Schema Definition
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Atomic Physical Table Creation (tableGenerator.js)           │
│ • Executes CREATE TABLE sbx_<id>.dataset_<name> via adminPool   │
│ • Grants SELECT privilege to sbx_<id>_reader                    │
│ • Inserts rows via multi-row parameterized chunks (500 per batch)│
│ • Registers dataset metadata in app.datasets & app.columns      │
└─────────────────────────────────────────────────────────────────┘
```

### Semantic Layer Metadata
After physical creation, users can enrich columns with business context (e.g., mapping `rev_usd` to `"Gross revenue after seasonal discounts"`). This semantic metadata is dynamically injected into the database catalog and consumed by the query planner.

---

## Query Execution & Self-Healing Loop

The query execution engine communicates with LLM providers using OpenAI-compatible function calling specifications:

```
User Natural Language Question
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Prompt Construction (promptBuilder.js)                       │
│ • Scans user's active sandbox schemas and column metadata       │
│ • Injects semantic layer column descriptions                    │
│ • Enforces read-only PostgreSQL dialect requirements            │
│ • Embeds auto-bilingual instructions (Persian/English)          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Tool Execution Loop (agentExecutor.js)                       │
│ Available tools:                                                │
│ • execute_sql(query): Runs query via isolated sandboxExecutor   │
│ • render_chart(chart_type, title, x_axis, y_axis, data)         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
            Database Error              Successful Execution
                     │                       │
                     ▼                       ▼
       ┌────────────────────────┐  ┌────────────────────────┐
       │ Self-Correction Step   │  │ Format Final Response  │
       │ Send error details,    │  │ • Structured answer    │
       │ hints, and schema back │  │ • Collapsible SQL      │
       │ to LLM for auto-repair │  │ • Interactive Chart    │
       │ (up to 5 retries)      │  └────────────────────────┘
       └─────────────┬──────────┘
                     │
                     └─► Re-evaluate
```

### Deterministic Local Fallback Engine
When `AI_API_KEY` is not configured, the service seamlessly routes requests to `runFallbackAgent()`. This engine performs deterministic introspection of the user's tables, compiles valid summary queries, executes them in the sandbox, and constructs real chart datasets without requiring external network connectivity.

---

## Visualization & Dashboard System

* **Adaptive Charts**: The `InteractiveChart` component renders Recharts Bar, Line, and Pie graphs. Colors adapt to system theme (light/dark) using balanced HSL palettes.
* **Bidirectional Typography**: Chat inputs and message bubbles dynamically detect Persian text using `/[ \u0600-\u06FF ]/` and apply `dir="rtl"` with the `Vazirmatn` font stack.
* **Persistent Dashboard**: Users can click **Pin** on any generated chart to commit the visualization structure, source query, and data snapshot to `app.pinned_dashboards`. The dedicated `/dashboard` view presents a responsive grid with live SQL inspection and animated unpinning.

---

## REST API Specification

### Authentication (`/api/auth`)
* `POST /api/auth/register`: Register user account.
  - Body: `{ email: string, password: string, name: string }`
  - Response: `201 Created` with `user` object and `HttpOnly` cookie.
* `POST /api/auth/login`: Authenticate existing user.
  - Body: `{ email: string, password: string }`
  - Response: `200 OK` with `user` object.
* `GET /api/auth/me`: Validate current session and retrieve profile.
  - Response: `200 OK` or `401 Unauthorized`.
* `POST /api/auth/logout`: Invalidate session cookie.

### Datasets (`/api/datasets`)
* `GET /api/datasets`: List all uploaded datasets for current user.
* `POST /api/datasets/upload`: Multipart upload for `.csv` or `.xlsx` files.
* `PUT /api/datasets/:id/semantic`: Update column descriptions.
  - Body: `{ columns: Array<{ columnName: string, semanticDescription: string }> }`
* `GET /api/datasets/:id/preview`: Fetch live sample rows directly from sandbox.
* `DELETE /api/datasets/:id`: Drop physical table and delete metadata.

### Chat & Analytics (`/api/chat`)
* `GET /api/chat/sessions`: Retrieve user's conversation threads.
* `POST /api/chat/sessions`: Create a new conversation thread.
* `GET /api/chat/sessions/:id`: Fetch message history for a thread.
* `POST /api/chat/sessions/:id/messages`: Submit user prompt, run agent tool loop, execute SQL, and return assistant response.
  - Body: `{ content: string }`
* `DELETE /api/chat/sessions/:id`: Delete conversation thread.

### Dashboard (`/api/dashboard`)
* `GET /api/dashboard/pins`: Retrieve all pinned charts for active user.
* `POST /api/dashboard/pins`: Pin a chart visualization to dashboard.
* `DELETE /api/dashboard/pins/:id`: Remove pinned chart.

---

## Environment Configuration

Configuration is managed via a single `.env` file at the repository root and validated at boot time with Zod (`server/src/config/env.js`).

| Variable | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | `string` | `development` | Runtime environment (`development`, `test`, `production`). |
| `PORT` | `number` | `4000` | Express API server port. |
| `CLIENT_ORIGIN` | `string` | `http://localhost:5173` | Allowed CORS origin for frontend requests. |
| `LOG_LEVEL` | `string` | `info` | Logging verbosity (`fatal`, `error`, `warn`, `info`, `debug`). |
| `POSTGRES_PORT` | `number` | `5432` | PostgreSQL listener port. |
| `POSTGRES_SUPERUSER` | `string` | `postgres` | Superuser username for Docker and bootstrapping. |
| `POSTGRES_SUPERUSER_PASSWORD` | `string` | — | Superuser password. |
| `DATABASE_URL` | `url` | — | Connection string for `app_admin` role (system catalog). |
| `AGENT_DATABASE_URL` | `url` | — | Connection string for `readonly_agent` role (sandbox). |
| `JWT_SECRET` | `string` | — | Secret key for signed session tokens (minimum 32 characters). |
| `SESSION_TTL_HOURS` | `number` | `12` | Session duration in hours before re-authentication. |
| `SANDBOX_STATEMENT_TIMEOUT_MS`| `number` | `5000` | Maximum SQL execution duration before cancellation. |
| `SANDBOX_MAX_ROWS` | `number` | `500` | Maximum result rows returned from sandbox queries. |
| `AI_API_KEY` | `string` | `""` | Optional LLM provider API key (Aval AI, OpenAI, Claude). |
| `AI_BASE_URL` | `url` | `https://api.avalai.ir/v1` | LLM provider base URL endpoint. |
| `AI_MODEL` | `string` | `gpt-4o-mini` | Model identifier for tool calling completion. |

---

## Local Development & Quickstart

### Prerequisites
* **Node.js**: v22.0.0 or higher (`node -v`)
* **PostgreSQL**: v16.0 or higher (Docker or local installation)

### 1. Repository Setup
```bash
# Clone repository
git clone <repository_url>
cd text-to-sql

# Install all workspace dependencies (root, server, and client)
npm run setup
```

### 2. Environment Setup
```bash
# Copy template configuration
cp .env.example .env
```
Update `.env` with your desired database credentials and secrets.

### 3. Database Initialization
```bash
# Start containerized PostgreSQL 16
npm run db:up

# Provision administrative roles and sandbox reader permissions
npm run db:bootstrap

# Apply system schema migrations
npm run db:migrate
```

### 4. Run Development Environment
```bash
# Starts Express server (:4000) and Vite development server (:5173) concurrently
npm run dev
```

* Frontend application: [http://localhost:5173](http://localhost:5173)
* Backend API health: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## Automated Testing & Security Verification

```bash
# Run server test suite (unit tests, AST guards, data type inference, passwords)
npm test

# Run frontend linting (ESLint 10 with React 19 rules)
npm run lint

# Compile production frontend bundle
npm run build --prefix client

# Run automated penetration test suite against PostgreSQL sandbox
npm run db:verify-sandbox
```

For manual end-to-end verification, follow the comprehensive [Quality Assurance Runbook](file:///h:/coding/text-to-SQL/MANUAL_TESTING_GUIDE.md).

---

## Repository Directory Structure

```
text-to-sql/
├── .env.example                # Documented configuration template
├── docker-compose.yml          # Isolated PostgreSQL 16 container definition
├── MANUAL_TESTING_GUIDE.md     # Comprehensive QA evaluation runbook
├── README.md                   # System documentation & architectural reference
├── package.json                # Workspace scripts & orchestration
├── samples/                    # Test datasets for validation & multi-table joins
│   ├── sales_data.csv
│   └── customers_data.csv
├── client/                     # Frontend Single-Page Application (React 19)
│   ├── src/
│   │   ├── api/                # HTTP fetch client & error handling
│   │   ├── components/         # Reusable UI modules (Charts, Modals, Layout)
│   │   ├── context/            # AuthContext & ThemeContext state providers
│   │   ├── pages/              # Landing, Auth, Datasets, Chat, Dashboard
│   │   └── index.css           # Tailwind CSS v4 tokens & theme variables
│   ├── vite.config.js          # Vite build pipeline with vendor splitting
│   └── package.json
└── server/                     # Backend API & Sandbox Execution Engine
    ├── db/
    │   ├── migrations/         # PostgreSQL DDL migration scripts
    │   └── scripts/            # Bootstrap, migration, and sandbox verification
    ├── src/
    │   ├── config/             # Zod-validated runtime environment
    │   ├── db/                 # Connection pools, transaction runners, escaping
    │   ├── lib/                # Structured logger, scrypt hashing, errors
    │   ├── middleware/         # Auth verification, rate limiting, error handling
    │   ├── modules/            # Domain modules (auth, datasets, chat, dashboard)
    │   ├── sandbox/            # AST sqlGuard, sandboxExecutor, naming logic
    │   ├── app.js              # Express app wiring
    │   └── server.js           # HTTP listener & graceful shutdown handlers
    └── test/                   # Native Node.js test suites
```

---

## Production Deployment & Operational Hardening

When deploying to a production cluster or cloud environment, observe the following engineering recommendations:

1. **Reverse Proxy & TLS Termination**: Run behind an edge proxy (NGINX, Cloudflare, or AWS ALB) enforcing HTTPS. Ensure `CLIENT_ORIGIN` matches the exact frontend domain.
2. **PostgreSQL Network Isolation**: Ensure PostgreSQL instances only accept connections from backend service IP addresses. Never expose port 5432 publicly.
3. **Connection Pool Sizing**: Tune `max` pool sizes in `server/src/db/pools.js` according to PostgreSQL `max_connections` and CPU core allocations:
   - `adminPool`: Small pool (5–10 connections) for schema operations.
   - `agentPool`: Dedicated pool (20–50 connections) sized to handle concurrent sandbox evaluations.
4. **Credential Rotation**: Store `POSTGRES_SUPERUSER_PASSWORD`, `JWT_SECRET`, and `AI_API_KEY` in secure secret management systems (AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets).
5. **Observability**: Structured logs emitted by Pino can be ingested directly by log aggregators (Datadog, Loki, CloudWatch) without transformation.

---

## License
Proprietary software. All rights reserved.
