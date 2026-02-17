# Implementation TODO Checklist

**Project:** Marginal Efficiency Radar - Local-First Refactor
**Estimated Time:** 9-12 hours

Use this checklist to track implementation progress. Check off items as you complete them.

---

## Pre-Flight Checks

- [x] Docker Desktop installed (version 20.10+)
- [x] Docker Compose CLI available (`docker compose version`)
- [x] Read PRD.md completely
- [x] Read IMPLEMENTATION_GUIDE.md
- [x] Python 3.11 matches backend/Dockerfile version
- [x] Backup existing .env files if present

---

## Phase 1: Docker Compose Infrastructure (2-3 hours)

### Files to Create
- [x] `/docker-compose.yml` - 3-service orchestration
- [x] `/backend/Dockerfile` - Update with postgres client
- [x] `/frontend/Dockerfile` - New Node container
- [x] `/.env.example` - Unified configuration
- [x] `/setup.sh` - Installation script with Docker checks
- [x] Run `chmod +x setup.sh`

### docker-compose.yml Checklist
- [x] Postgres service with healthcheck
- [x] Backend depends on postgres (condition: service_healthy)
- [x] Frontend depends on backend
- [x] Volume: postgres_data (named volume)
- [x] Volume: ./backend:/app (live reload)
- [x] Volume: ./frontend:/app (live reload)
- [x] Volume: /app/node_modules (anonymous)
- [x] Volume: ./backend/migrations:/docker-entrypoint-initdb.d
- [x] Network: default bridge network auto-created
- [x] Ports: postgres:5432, backend:8000, frontend:3000

### backend/Dockerfile Checklist
- [x] FROM python:3.11-slim
- [x] Install gcc and postgresql-client via apt-get
- [x] COPY requirements.txt and pip install
- [x] COPY source code
- [x] CMD includes seed script: `python scripts/seed_data.py &&`
- [x] CMD includes uvicorn: `uvicorn app.main:app --host 0.0.0.0 --reload`

### frontend/Dockerfile Checklist
- [x] FROM node:20-alpine
- [x] WORKDIR /app
- [x] COPY package*.json
- [x] RUN npm install
- [x] COPY source code
- [x] EXPOSE 3000
- [x] CMD npm run dev

### .env.example Checklist
- [x] DATABASE_URL with postgres service name (not localhost)
- [x] USE_SUPABASE=false
- [x] Optional SUPABASE_URL and SUPABASE_SERVICE_KEY placeholders
- [x] MIN_DATA_DAYS=21
- [x] MARGINAL_INCREMENT=0.10
- [x] ALPHA_MIN, ALPHA_MAX, ALPHA_STEP
- [x] BETA_MIN, BETA_MAX
- [x] NEXT_PUBLIC_API_URL=http://localhost:8000

### setup.sh Checklist
- [x] Check for docker command
- [x] Check for docker compose command
- [x] Copy .env.example to .env if not exists
- [x] Print success message with next steps
- [x] Has executable permissions

### Phase 1 Testing
- [x] Run `./setup.sh` - completes without errors
- [x] Run `docker-compose up` - all 3 services start
- [x] Verify postgres: `docker-compose exec postgres pg_isready -U localuser`
- [x] Verify backend: `curl http://localhost:8000/api/health`
- [x] Verify frontend: `curl -I http://localhost:3000`
- [x] Check logs: `docker-compose logs` shows no errors

---

## Phase 2: Database Layer Abstraction (3-4 hours)

### Files to Modify
- [x] `/backend/requirements.txt` - Add SQLAlchemy, Alembic, psycopg2
- [x] `/backend/app/config.py` - Add database_url and use_supabase settings
- [x] `/backend/app/services/supabase_client.py` → Rename to `database.py`
- [x] `/backend/app/routers/analysis.py` - Update imports
- [x] `/backend/app/main.py` - Add init_db startup event
- [x] `/backend/scripts/seed_data.py` - Rewrite for SQLAlchemy

### Files to Create
- [x] `/backend/app/models/db_models.py` - SQLAlchemy models
- [x] `/backend/migrations/001_init.sql` - Postgres schema

### requirements.txt Checklist
- [x] Add: sqlalchemy==2.0.25
- [x] Add: alembic==1.13.1
- [x] Add: psycopg2-binary==2.9.9
- [x] Rebuild container: `docker-compose up --build backend`

### config.py Checklist
- [x] Import: from pydantic_settings import BaseSettings
- [x] Add database_url field (str)
- [x] Add use_supabase field (bool, default False)
- [x] Add supabase_url field (str | None)
- [x] Add supabase_service_key field (str | None)
- [x] Keep all existing settings (min_data_days, etc.)
- [x] Test: `docker-compose exec backend python -c "from app.config import get_settings; print(get_settings())"`

### db_models.py Checklist
- [x] Import: from sqlalchemy import Column, String, Numeric, Date, DateTime, Integer, ForeignKey, UniqueConstraint
- [x] Import: from sqlalchemy.dialects.postgresql import UUID
- [x] Import: from sqlalchemy.ext.declarative import declarative_base
- [x] Define Base = declarative_base()
- [x] Create Account model (id, name, created_at, updated_at)
- [x] Create DailyMetric model (all fields + UNIQUE constraint)
- [x] Create MMMModel model (all fields)
- [x] Create Scenario model (all fields with JSONB for budget_allocation)
- [x] Test: `docker-compose exec backend python -c "from app.models.db_models import Base; print(Base.metadata.tables.keys())"`

### 001_init.sql Checklist
- [x] CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
- [x] CREATE TABLE IF NOT EXISTS accounts (...)
- [x] CREATE TABLE IF NOT EXISTS daily_metrics (...) with UNIQUE constraint
- [x] CREATE TABLE IF NOT EXISTS mmm_models (...)
- [x] CREATE TABLE IF NOT EXISTS scenarios (...) with JSONB
- [x] CREATE INDEX idx_daily_metrics_account_id
- [x] CREATE INDEX idx_daily_metrics_date
- [x] CREATE INDEX idx_mmm_models_account_id
- [x] CREATE INDEX idx_scenarios_account_id
- [x] Schema matches Supabase version exactly

### database.py Rewrite Checklist
- [x] Delete all Supabase imports
- [x] Add SQLAlchemy imports (create_engine, select, sessionmaker)
- [x] Implement get_engine() with @lru_cache
- [x] Implement get_session() returning Session
- [x] Implement init_db() calling Base.metadata.create_all()
- [x] Rewrite fetch_daily_metrics() using select(DailyMetric).where()
- [x] Rewrite fetch_channels_for_account() using select().distinct()
- [x] Rewrite get_current_spend() using select().order_by().limit(1)
- [x] Rewrite save_model_params() with upsert logic (check exists → update or insert)
- [x] Rewrite get_model_params() using select(MMMModel).where()
- [x] All functions return same data types as before
- [x] Test: `docker-compose exec backend python -c "from app.services.database import init_db; init_db()"`

### analysis.py Checklist
- [x] Change import: from app.services.database import (...)
- [x] Verify no other changes needed (function signatures match)

### main.py Checklist
- [x] Add import: from app.services.database import init_db
- [x] Add startup event: @app.on_event("startup") async def startup(): init_db()

### seed_data.py Rewrite Checklist
- [x] Delete Supabase client usage
- [x] Import: from app.services.database import get_session
- [x] Import: from app.models.db_models import DailyMetric, Account, MMMModel
- [x] Create account: session.add(Account(...))
- [x] Create metrics: session.add(DailyMetric(...))
- [x] Keep same data generation logic (4 channels, 60 days)
- [x] Keep same Hill Function curves (Google=green, Meta=yellow, TikTok=red, LinkedIn=grey)
- [x] Call session.commit() and session.close()
- [x] Test: `docker-compose exec backend python scripts/seed_data.py`

### Phase 2 Testing
- [x] Restart: `docker-compose down -v && docker-compose up --build`
- [x] Verify tables: `docker-compose exec postgres psql -U localuser -d budgetradar -c "\dt"`
- [x] Verify seed data: `docker-compose exec postgres psql -U localuser -d budgetradar -c "SELECT COUNT(*) FROM daily_metrics"`
- [x] Test API: `curl -X POST http://localhost:8000/api/analyze-channels -H "Content-Type: application/json" -d '{"account_id":"a8465a7b-bf39-4352-9658-4f1b8d05b381","target_cpa":50}'`
- [x] Open frontend: `open http://localhost:3000` - should see 4 channels
- [x] Verify traffic lights: Google (green), Meta (yellow), TikTok (red), LinkedIn (grey)

---

## Phase 3: CSV Upload Feature (2-3 hours)

### Files to Create
- [x] `/backend/app/routers/import_data.py` - CSV processing endpoint
- [x] `/frontend/src/app/import/page.tsx` - Import page UI
- [x] `/frontend/src/components/CsvUploader.tsx` - Upload component

### Files to Modify
- [x] `/backend/app/main.py` - Include import router
- [x] `/frontend/src/app/layout.tsx` - Add navigation

### import.py Checklist
- [x] Import: from fastapi import APIRouter, UploadFile, File, Form, HTTPException
- [x] Import: from fastapi.responses import FileResponse
- [x] Import: import pandas as pd, io
- [x] Import: from app.services.database import get_session
- [x] Import: from app.models.db_models import DailyMetric, Account
- [x] Create router: APIRouter(prefix="/api/import", tags=["import"])
- [x] POST /csv endpoint:
  - [x] Validate file extension (.csv)
  - [x] Parse with pandas.read_csv()
  - [x] Validate required columns: date, channel_name, spend, revenue
  - [x] Parse dates: pd.to_datetime(df['date']).dt.date
  - [x] Validate numeric columns with pd.to_numeric()
  - [x] Handle optional impressions column
  - [x] Create account if not exists
  - [x] Upsert DailyMetric records
  - [x] Return success response with stats
- [x] GET /template endpoint:
  - [x] Return sample CSV with Google Ads and Meta Ads
- [x] Test: `curl http://localhost:8000/api/import/template`

### main.py Import Router Checklist
- [x] Add import: from app.routers import import as import_router
- [x] Add: app.include_router(import_router.router)
- [x] Restart backend: `docker-compose restart backend`

### import/page.tsx Checklist
- [x] Add 'use client' directive (for client-side state)
- [x] Import CsvUploader component
- [x] Import Card from @tremor/react
- [x] useState for accountId (hardcoded for local)
- [x] Render title and description
- [x] Render CsvUploader component
- [x] Render Card with CSV format requirements
- [x] Add link to /api/import/template

### CsvUploader.tsx Checklist
- [x] Import: useState from 'react'
- [x] Import: Button, Card from @tremor/react
- [x] Define CsvUploaderProps interface (accountId: string)
- [x] useState for: file, uploading, result, error
- [x] handleFileChange function
- [x] handleUpload function:
  - [x] Create FormData with file and account_id
  - [x] POST to http://localhost:8000/api/import/csv
  - [x] Handle response (success or error)
- [x] Render file input with accept=".csv"
- [x] Render upload button (disabled if no file or uploading)
- [x] Render error message if error
- [x] Render success message with stats if result
- [x] Add link to "/" (dashboard) after success

### layout.tsx Navigation Checklist
- [x] Add header element with sticky positioning
- [x] Add h1 with app title
- [x] Add nav element with flex layout
- [x] Add link to "/" (Dashboard)
- [x] Add link to "/import" (Import Data)
- [x] Style with Tailwind classes

### Phase 3 Testing
- [x] Navigate to http://localhost:3000/import
- [x] Download template CSV
- [x] Upload template CSV
- [x] Verify success message with row count
- [x] Click "View Dashboard" link
- [x] Verify channels appear in dashboard
- [x] Test error: Upload .txt file (should reject)
- [x] Test error: Upload CSV with missing column (should show validation error)

---

## Phase 4: Unified Developer Experience (1 hour)

### Files to Create
- [x] `/Makefile` - Task runner for common commands

### Makefile Checklist
- [x] .PHONY: help install dev seed test clean logs health
- [x] help target (default): Display all commands
- [x] install target: Run setup.sh
- [x] dev target: docker-compose up --build
- [x] seed target: docker-compose exec backend python scripts/seed_data.py
- [x] test target: docker-compose exec backend pytest && docker-compose exec frontend npm test
- [x] logs target: docker-compose logs -f
- [x] health target: curl health endpoints for all 3 services
- [x] clean target: docker-compose down -v
- [x] Use tabs (not spaces) for indentation

### Phase 4 Testing
- [x] Run `make help` - displays all commands
- [x] Run `make clean` - stops and removes containers
- [x] Run `make dev` - starts fresh containers
- [x] Run `make seed` - repopulates database
- [x] Run `make health` - shows all services healthy
- [x] Run `make logs` - streams live logs (Ctrl+C to exit)

---

## Phase 5: Documentation & Polish (1-2 hours)

### Files to Update
- [x] `/README.md` - Rewrite for local-first
- [x] `/CLAUDE.md` - Update architecture and commands

### Files to Create
- [x] `/ARCHITECTURE.md` - Docker setup explanation
- [x] `/docs/MIGRATION.md` - Supabase deployment guide
- [x] `/docs/CSV_FORMAT.md` - CSV specifications

### README.md Checklist
- [x] Title: Marginal Efficiency Radar 🎯
- [x] Description: Local-first Marketing FP&A tool
- [x] 🚀 Quick Start section (3 commands)
- [x] 📊 How It Works section
- [x] 🏗️ Architecture section (Next.js + FastAPI + PostgreSQL)
- [x] 📦 Commands section (make dev, seed, test, clean)
- [x] 📁 CSV Format section with example
- [x] 🔧 Configuration section (.env variables)
- [x] 📖 Documentation section (links to other docs)
- [x] 🤝 Contributing section (mention Supabase migration)
- [x] 📄 License section (MIT)

### ARCHITECTURE.md Checklist
- [x] Docker Compose overview
- [x] Service dependency diagram
- [x] Volume mount explanation (live reload + anonymous node_modules)
- [x] SQLAlchemy abstraction layer
- [x] Database schema (tables and relationships)
- [x] Hill Function math (link to existing docs)
- [x] Traffic light decision logic

### MIGRATION.md Checklist
- [x] Prerequisites (Supabase account, Vercel account)
- [x] Step 1: Set USE_SUPABASE=true
- [x] Step 2: Add SUPABASE_URL and SUPABASE_SERVICE_KEY
- [x] Step 3: Create Supabase project
- [x] Step 4: Run migrations
- [x] Step 5: Enable Row Level Security
- [x] Step 6: Deploy frontend to Vercel
- [x] Step 7: Update NEXT_PUBLIC_API_URL

### CSV_FORMAT.md Checklist
- [x] Required columns: date, channel_name, spend, revenue
- [x] Optional columns: impressions
- [x] Date format: YYYY-MM-DD
- [x] Numeric format: no currency symbols, commas allowed
- [x] Validation rules
- [x] Example CSV with 30 days of data
- [x] Common errors and fixes

### CLAUDE.md Updates Checklist
- [x] Update Architecture section with Docker Compose
- [x] Update Development Commands with make commands
- [x] Add CSV import instructions
- [x] Keep Hill Function math unchanged
- [x] Keep traffic light rules unchanged
- [x] Keep critical guardrails (21-day minimum, 10% increment)

---

## Final Testing & Validation (1 hour)

### Fresh Clone Test
- [x] Clone repo to /tmp/budgetradar-test
- [x] Run `bash setup.sh`
- [x] Run `docker-compose up`
- [x] Open http://localhost:3000
- [x] Verify dashboard loads with 4 channels
- [x] Time the process: < 2 minutes (excluding Docker pull)

### CSV Import Test
- [x] Create custom CSV (30 days, 1 new channel)
- [x] Upload via http://localhost:3000/import
- [x] Verify success message
- [x] Navigate to dashboard
- [x] Verify new channel appears with traffic light

### Offline Test
- [x] Ensure Docker images pulled: `docker-compose pull`
- [x] Disconnect internet
- [x] Run `docker-compose down && docker-compose up`
- [x] Verify dashboard loads
- [x] Verify API calls work

### Regression Test
- [x] Run existing tests: `docker-compose exec backend pytest`
- [x] Verify traffic lights match expected:
  - [x] Google Ads: green (marginal_cpa < 45)
  - [x] Meta Ads: yellow (marginal_cpa ≈ 50)
  - [x] TikTok Ads: red (marginal_cpa > 55)
  - [x] LinkedIn Ads: grey (marginal_cpa = null, < 21 days)
- [x] Verify Hill Function unchanged (R² values match)

---

## Completion Checklist

### Functional Requirements
- [x] `docker-compose up` starts all 3 services without errors
- [x] Dashboard loads at http://localhost:3000 with 4 demo channels
- [x] All 4 channels show correct traffic lights
- [x] CSV upload works via /import page
- [x] Uploaded data appears in dashboard
- [x] `make dev`, `make seed`, `make test`, `make clean` all work
- [x] Works offline after initial Docker pull

### Code Quality
- [x] No Supabase imports remain
- [x] SQLAlchemy models match Supabase schema exactly
- [x] All Hill Function tests pass
- [x] No hardcoded credentials (except localuser/localpass)
- [x] Error messages are user-friendly

### Documentation
- [x] README.md has 60-second quickstart
- [x] ARCHITECTURE.md explains Docker setup
- [x] MIGRATION.md explains Supabase deployment
- [x] CSV_FORMAT.md documents CSV requirements
- [x] CLAUDE.md updated with new architecture
- [x] All documentation links work

### Success Criteria
- [x] Fresh clone → working dashboard in < 2 minutes
- [x] CSV upload → see results without understanding schema
- [x] Works completely offline
- [x] Single .env file for all config
- [x] Make commands work
- [x] Documentation clear for non-technical users

---

## Total Progress

**Phases Completed:** 5 / 5

**Estimated Time Remaining:** 0 hours

**Git Strategy:**
- [x] Create branch: `git checkout -b feature/local-first-refactor`
- [x] Commit each phase separately
- [x] Tag v2.0.0 when complete
- [x] Keep main branch as v1.x (Supabase version)

---

✅ **When all checkboxes are complete, the local-first refactor is ready for deployment.**
