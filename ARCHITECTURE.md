# Architecture: Local-First BudgetRadar

## Overview

The generic `docker-compose up` command orchestrates three services to Create a complete local development environment.

```ascii
┌─────────────────────────────────────────────┐
│         Docker Compose Orchestration         │
│                                             │
│  ┌──────────────┐      ┌──────────────┐     │
│  │   Frontend   │      │    Backend   │     │
│  │   (Next.js)  │◄────►│   (FastAPI)  │     │
│  │    :3000     │      │     :8000    │     │
│  └──────────────┘      └───────┬──────┘     │
│                                │            │
│                        ┌───────▼──────┐     │
│                        │   Database   │     │
│                        │ (PostgreSQL) │     │
│                        │     :5432    │     │
│                        └──────────────┘     │
└─────────────────────────────────────────────┘
```

## Services

### 1. Database (PostgreSQL 15)
- **Image:** `postgres:15-alpine`
- **Port:** Exposes 5432 on host
- **Persistence:** Uses named volume `postgres_data`
- **Validation:** Healthcheck ensures backend waits for readiness
- **Initialization:** Maps `backend/migrations` to `/docker-entrypoint-initdb.d` to auto-create schema on first run.

### 2. Backend (FastAPI)
- **Image:** Python 3.11-slim
- **Port:** Exposes 8000 on host
- **ORM:** SQLAlchemy 2.0 (replaces Supabase client)
- **Math Engine:** Scipy + NumPy for Hill Function fitting
- **Uploads:** Python-Multipart for CSV ingestion
- **Startup:** Runs `init_db()` and `seed_data.py` automatically if empty.

### 3. Frontend (Next.js 16 + React 19)
- **Image:** Node 20-alpine
- **Port:** Exposes 3000 on host
- **UI Lib:** Tremor + Tailwind CSS
- **Fetch:** Server Actions + standard Fetch API to localhost:8000
- **Volume:** Anonymous volume for `/app/node_modules` prevents host OS conflict.

## Data Flow

1. **Ingestion:**
   - User uploads CSV -> Frontend -> Backend (`/api/import/csv`)
   - Backend parses with Pandas -> Validates -> Upserts to Postgres
   - Upsert logic prevents duplicate daily metrics.

2. **Analysis:**
   - Frontend requests `analyze-channels`
   - Backend fetches raw daily metrics from Postgres
   - Backend fits Hill Curve: $Revenue = \text{MaxYield} \times \frac{Spend^\beta}{\kappa^\beta + Spend^\beta}$
   - Backend calculates Marginal CPA at current spend level
   - Backend returns Traffic Light status (Green/Yellow/Red/Grey)

## Database Schema

**Matched to original Supabase Schema for compatibility:**

- **accounts:** `id (UUID), name`
- **daily_metrics:** `account_id, date, channel_name, spend, revenue, impressions`
  - *Constraint:* Unique (account_id, date, channel_name)
- **mmm_models:** `account_id, channel_name, alpha, beta, kappa...`
  - Stores the fitted parameters for caching/reference.

## Key Design Decisions

1. **Local-First:** Dependency on `supabase-py` was abstracted behind a `database.py` service layer.
   - If `USE_SUPABASE=false` (default), uses SQLAlchemy.
   - If `USE_SUPABASE=true`, uses Supabase client (legacy mode).

2. **Stateless Backend:** The backend container can be destroyed and recreated at will. State lives only in `postgres_data` volume.

3. **Auto-Seeding:** To improve Developer Experience (DX), the seed script runs automatically on container start, ensuring you never see a blank dashboard.
