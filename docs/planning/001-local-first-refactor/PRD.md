# PRD: Marginal Efficiency Radar - Local-First Refactor

**Version:** 2.0.0
**Date:** 2026-02-15
**Status:** Ready for Implementation

---

## Executive Summary

Transform the Marginal Efficiency Radar from a cloud-dependent multi-tenant application into a **local-first** tool that runs with a single `docker-compose up` command. This refactor eliminates the Supabase setup friction while preserving the production-quality architecture and numerical accuracy of the Hill Function mathematics.

**Key Outcome:** Developers can clone the repo and see a working dashboard with demo data in under 2 minutes.

---

## Context

### Current State
- Multi-tenant cloud architecture requiring Supabase account setup
- Separate frontend (Next.js) and backend (Python FastAPI) servers
- High friction onboarding: ~10 manual setup steps across 2 directories
- Requires cloud database configuration before seeing results
- Environment variables scattered across frontend/.env and backend/.env

### Problem Statement
- **Discovery Barrier:** Too heavy for developers to quickly evaluate on GitHub
- **Offline Limitation:** Can't run offline or fully locally
- **Dependency Hell:** Python venv + npm setup causes version conflicts
- **No "One Command" Experience:** Requires multiple terminal windows and commands

### Proposed Solution
Create a Docker Compose orchestration that bundles PostgreSQL, FastAPI backend, and Next.js frontend into a single command. Replace Supabase with local PostgreSQL while maintaining schema compatibility for future cloud migration.

---

## Goals & Non-Goals

### Primary Goals
1. **One-Command Startup** - `docker-compose up` starts all services
2. **Zero Cloud Dependencies** - Local PostgreSQL replaces Supabase
3. **Instant Demo Data** - Auto-seed on first run
4. **CSV Upload Interface** - Drag-and-drop for marketing data import
5. **Preserve Math Quality** - Keep Python/scipy (no JavaScript rewrites)

### Non-Goals
- ❌ Not removing cloud deployment option (keep migration path)
- ❌ Not changing Hill Function algorithm or traffic light logic
- ❌ Not building API integrations with ad platforms (CSV-first)
- ❌ Not adding authentication (single-user local mode)

---

## Success Criteria

- [ ] Fresh clone → `docker-compose up` → see dashboard in **< 2 minutes**
- [ ] CSV upload works without understanding database schema
- [ ] Works completely offline (no internet after Docker pull)
- [ ] Single `.env` file for all configuration
- [ ] `make dev`, `make seed`, `make test`, `make clean` commands work
- [ ] Documentation shows "60-second quickstart" with screenshots
- [ ] All existing Hill Function unit tests pass
- [ ] Dashboard UI matches original design exactly

---

## Technical Architecture

### New Stack Diagram
```
┌─────────────────────────────────────────────┐
│         Docker Compose Orchestration         │
├─────────────────────────────────────────────┤
│  Frontend (Next.js)  │  Backend (FastAPI)   │
│  localhost:3000      │  localhost:8000      │
├──────────────────────┴──────────────────────┤
│         PostgreSQL 15 (local container)      │
│         localhost:5432                       │
└─────────────────────────────────────────────┘
```

### Technology Decisions

| Component | Current | Refactored | Rationale |
|-----------|---------|------------|-----------|
| **Database** | Supabase Cloud | PostgreSQL 15 (Docker) | Local-first, offline capable |
| **DB Client** | supabase-py | SQLAlchemy 2.0 | Standard ORM, Supabase-agnostic |
| **Auth** | Supabase Auth + RLS | None (local single-user) | Simplified for local use |
| **Orchestration** | Manual (2 terminals) | Docker Compose | One command startup |
| **Configuration** | Split .env files | Unified root .env | Single source of truth |
| **Data Ingestion** | API integrations | CSV upload UI | Manual, user-controlled |

### Database Migration Strategy

**From:** Supabase client with service keys
**To:** SQLAlchemy ORM with local Postgres

**Key Principle:** Database schema remains **identical** to enable future Supabase migration via `USE_SUPABASE=true` flag.

**Abstraction Layer:**
```python
# Old (supabase_client.py)
from supabase import create_client
supabase = create_client(url, key)

# New (database.py)
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL)
# Falls back to Supabase if USE_SUPABASE=true
```

---

## Implementation Phases

### Phase 1: Docker Compose Infrastructure (2-3 hours)

**Goal:** Single command startup

**Deliverables:**
- `docker-compose.yml` - 3 services (postgres, backend, frontend)
- `backend/Dockerfile` - Updated with postgres client
- `frontend/Dockerfile` - New file
- `.env.example` - Unified configuration
- `setup.sh` - Installation script with Docker checks

**Key Technical Details:**
- Postgres service uses `postgres:15-alpine` image
- Healthcheck ensures backend waits for database readiness
- Volume mounts enable live reload during development
- Anonymous volume for node_modules prevents host conflicts

### Phase 2: Database Layer Abstraction (3-4 hours)

**Goal:** Replace Supabase with SQLAlchemy

**Deliverables:**
- `backend/app/models/db_models.py` - SQLAlchemy models
- `backend/app/services/database.py` - Renamed from supabase_client.py
- `backend/migrations/001_init.sql` - SQL migration script
- Updated `config.py`, `analysis.py`, `main.py`, `seed_data.py`

**Key Technical Details:**
- SQLAlchemy models match Supabase schema exactly
- UNIQUE constraint on (account_id, date, channel_name)
- Upsert logic for mmm_models table
- Init script runs on postgres container startup via `/docker-entrypoint-initdb.d`

### Phase 3: CSV Upload Feature (2-3 hours)

**Goal:** Drag-and-drop CSV import

**Deliverables:**
- `backend/app/routers/import.py` - CSV processing endpoint
- `frontend/src/app/import/page.tsx` - Import page UI
- `frontend/src/components/CsvUploader.tsx` - Upload component
- Updated navigation in `layout.tsx`

**Key Technical Details:**
- Pandas for CSV parsing and validation
- Required columns: date, channel_name, spend, revenue
- Upsert logic prevents duplicate daily metrics
- Template CSV download at `/api/import/template`

### Phase 4: Unified Developer Experience (1 hour)

**Goal:** Makefile for common tasks

**Deliverables:**
- `Makefile` - dev, seed, test, clean, logs, health commands

**Key Technical Details:**
- `make dev` runs `docker-compose up --build`
- `make seed` executes seed script in backend container
- `make health` checks all 3 services with curl + pg_isready

### Phase 5: Documentation & Polish (1-2 hours)

**Goal:** Clear documentation for new users

**Deliverables:**
- Updated `README.md` with 60-second quickstart
- New `ARCHITECTURE.md` explaining Docker setup
- New `docs/MIGRATION.md` for Supabase deployment
- New `docs/CSV_FORMAT.md` with format specs
- Updated `CLAUDE.md` with Docker commands

---

## Critical File Changes Reference

### Root Level (New Files)
```
/docker-compose.yml         ← Orchestration config
/.env.example               ← Unified environment template
/setup.sh                   ← Installation script
/Makefile                   ← Task runner
/ARCHITECTURE.md            ← Docker architecture docs
```

### Backend (Modified Files)
```
/backend/Dockerfile                          ← ADD postgres-client
/backend/requirements.txt                    ← ADD sqlalchemy, psycopg2-binary
/backend/app/config.py                       ← ADD database_url, use_supabase
/backend/app/services/supabase_client.py     → RENAME to database.py
/backend/app/routers/analysis.py             ← CHANGE import to database
/backend/app/main.py                         ← ADD init_db() startup event
/backend/scripts/seed_data.py                ← REWRITE for SQLAlchemy
```

### Backend (New Files)
```
/backend/app/models/db_models.py             ← SQLAlchemy models
/backend/app/routers/import.py               ← CSV upload endpoint
/backend/migrations/001_init.sql             ← Postgres schema
```

### Frontend (New Files)
```
/frontend/Dockerfile                         ← Node container
/frontend/src/app/import/page.tsx            ← Import page
/frontend/src/components/CsvUploader.tsx     ← Upload component
```

### Frontend (Modified Files)
```
/frontend/src/app/layout.tsx                 ← ADD navigation header
```

### Documentation (New Files)
```
/docs/MIGRATION.md                           ← Deploy to Supabase guide
/docs/CSV_FORMAT.md                          ← CSV specifications
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Docker not installed | High | setup.sh checks for Docker, provides clear error |
| Port conflicts (3000/8000/5432) | Medium | Document how to change ports in docker-compose.yml |
| SQLAlchemy migration breaks API | High | Keep function signatures identical, test Phase 2 thoroughly |
| CSV validation edge cases | Medium | Robust pandas validation + error messages |
| Volume mount permission issues | Low | Use standard Docker volume patterns |
| Auto-seed runs every startup | Low | Document how to disable in Dockerfile |

---

## Dependencies

### External Dependencies
- Docker Desktop 20.10+ (required)
- Docker Compose v2+ (required)
- Internet (only for initial Docker image pull)

### Python Dependencies (New)
```
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
```

### Container Images
- `postgres:15-alpine` (~80MB)
- `python:3.11-slim` (base for backend)
- `node:20-alpine` (base for frontend)

---

## Testing Strategy

### Phase Testing
- **Phase 1:** Verify all 3 containers start and healthchecks pass
- **Phase 2:** Test API endpoint returns same results as Supabase version
- **Phase 3:** Upload CSV, verify data in dashboard
- **Phase 4:** Run all make commands
- **Phase 5:** Fresh clone test in clean directory

### Regression Testing
- All existing Hill Function unit tests must pass
- Traffic light logic unchanged (verify with seed data)
- Dashboard UI matches original design pixel-perfect

### Integration Testing
- End-to-end: CSV upload → analyze → see results in < 30 seconds
- Offline test: Disconnect internet, restart containers
- Cross-platform: Test on macOS, Linux, Windows WSL2

---

## Rollback Plan

If implementation fails, revert to Supabase version:

1. `git checkout main` (keep v1.x on main branch)
2. Delete Docker artifacts: `docker-compose down -v`
3. Restore Supabase environment variables
4. Run original setup: `cd backend && source venv/bin/activate && pip install -r requirements.txt`

**Feature branch:** `feature/local-first-refactor`
**Tag:** v2.0.0 when complete

---

## Future Enhancements (Out of Scope)

- Authentication for multi-user local deployment
- Real-time data sync with ad platform APIs
- Budget allocation scenario planning (scenarios table exists but unused)
- Email alerts when channels hit red traffic light
- Export PDF reports of marginal CPA analysis

---

## Appendix: Configuration Reference

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://localuser:localpass@postgres:5432/budgetradar
USE_SUPABASE=false  # Set to true for cloud deployment

# Supabase (optional, for cloud migration)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Backend Configuration
MIN_DATA_DAYS=21                # Cold start guardrail
MARGINAL_INCREMENT=0.10         # 10% spend increase for marginal CPA
ALPHA_MIN=0.0                   # Adstock decay min
ALPHA_MAX=0.8                   # Adstock decay max
BETA_MIN=0.5                    # Hill elasticity min
BETA_MAX=3.0                    # Hill elasticity max

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Docker Compose Services

| Service | Image | Ports | Depends On |
|---------|-------|-------|------------|
| postgres | postgres:15-alpine | 5432:5432 | - |
| backend | ./backend (Dockerfile) | 8000:8000 | postgres (healthy) |
| frontend | ./frontend (Dockerfile) | 3000:3000 | backend |

---

## Sign-Off

**Prepared by:** Claude (Planning Agent)
**Ready for:** Implementation Agent
**Estimated Effort:** 9-12 hours
**Target Completion:** Within 2 development days

**Success Definition:** User runs `docker-compose up`, sees dashboard with demo data in < 2 minutes, uploads CSV, sees new channels analyzed with traffic lights.
