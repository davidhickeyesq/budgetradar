# Implementation Guide for Executing Agent

**Project:** Marginal Efficiency Radar - Local-First Refactor
**Version:** 2.0.0
**Estimated Time:** 9-12 hours across 5 phases

---

## Overview

You are tasked with refactoring the Marginal Efficiency Radar from a cloud-dependent Supabase application to a local-first Docker Compose setup. This guide provides step-by-step instructions for implementation.

**Key Principle:** Preserve ALL existing functionality. Only infrastructure changes—no modifications to Hill Function math or traffic light logic.

---

## Prerequisites

Before starting:
- [ ] Read [PRD.md](./PRD.md) completely
- [ ] Review [TODO_CHECKLIST.md](./TODO_CHECKLIST.md)
- [ ] Ensure you have file edit/write permissions
- [ ] Understand Docker Compose networking
- [ ] Familiar with SQLAlchemy ORM
- [ ] Know Python FastAPI and Next.js basics

**DO NOT PROCEED** without Docker installed on target system. If Docker is missing, document this as a blocker.

---

## Phase-by-Phase Implementation

### Phase 1: Docker Compose Infrastructure (2-3 hours)

#### Objective
Create a 3-service Docker Compose setup that starts with one command.

#### Step 1.1: Create docker-compose.yml

**Location:** `/docker-compose.yml` (project root)

**Key Requirements:**
- Postgres service must have **healthcheck** (backend depends on it)
- Backend mounts `./backend:/app` for live reload
- Frontend mounts `./frontend:/app` but uses **anonymous volume** for node_modules
- Postgres mounts `./backend/migrations:/docker-entrypoint-initdb.d` for auto-init

**Critical Details:**
```yaml
volumes:
  postgres_data:  # Named volume for data persistence

services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U localuser"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**Why healthcheck matters:** Backend tries to connect immediately on startup. Without healthcheck, backend crashes with "connection refused."

**Copy full YAML from PRD Phase 1 section.**

#### Step 1.2: Update backend/Dockerfile

**Location:** `/backend/Dockerfile` (already exists, needs modification)

**Changes:**
1. Add `gcc` and `postgresql-client` to apt-get (needed for psycopg2)
2. Change CMD to run seed script first: `CMD ["sh", "-c", "python scripts/seed_data.py && uvicorn app.main:app --host 0.0.0.0 --reload"]`

**Why:** Auto-seed ensures users see demo data immediately on first run.

**⚠️ Warning:** DO NOT use `pip install psycopg2` (compilation required). Use `psycopg2-binary` instead.

**Copy full Dockerfile from PRD Phase 1 section.**

#### Step 1.3: Create frontend/Dockerfile

**Location:** `/frontend/Dockerfile` (new file)

**Why node_modules anonymous volume:**
If you mount the entire frontend directory, host machine's node_modules (or lack thereof) conflicts with container's node_modules. Anonymous volume protects container's version.

**Copy full Dockerfile from PRD Phase 1 section.**

#### Step 1.4: Create .env.example

**Location:** `/.env.example` (project root)

**Critical:**
- `DATABASE_URL` uses `postgres` as hostname (Docker service name), NOT `localhost`
- For local development outside Docker, user changes to `localhost:5432`
- `USE_SUPABASE=false` is the default

**Copy full .env.example from PRD Phase 1 section.**

#### Step 1.5: Create setup.sh

**Location:** `/setup.sh` (project root)

**After creation:** Run `chmod +x setup.sh` to make executable

**Copy full setup.sh from PRD Phase 1 section.**

#### Step 1.6: Test Phase 1

**Commands:**
```bash
./setup.sh                     # Should create .env
docker-compose up --build      # Should start all 3 services
```

**Expected Output:**
```
postgres_1   | database system is ready to accept connections
backend_1    | INFO:     Uvicorn running on http://0.0.0.0:8000
frontend_1   | ready - started server on 0.0.0.0:3000
```

**Verification:**
```bash
docker-compose exec postgres pg_isready -U localuser
# Output: /var/run/postgresql:5432 - accepting connections

curl http://localhost:8000/api/health
# Output: {"status":"healthy"}

curl -I http://localhost:3000
# Output: HTTP/1.1 200 OK
```

**If Tests Fail:**
- Check Docker Desktop is running
- Check ports 3000, 8000, 5432 are not in use (`lsof -i :3000`)
- Check Docker Compose version (`docker compose version` should be v2+)
- Read container logs: `docker-compose logs backend`

**DO NOT PROCEED to Phase 2 until all tests pass.**

---

### Phase 2: Database Layer Abstraction (3-4 hours)

#### Objective
Replace Supabase client with SQLAlchemy ORM while keeping schema identical.

#### Step 2.1: Update requirements.txt

**Location:** `/backend/requirements.txt`

**Add these lines:**
```
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
```

**After saving:** Rebuild backend container:
```bash
docker-compose down
docker-compose up --build backend
```

#### Step 2.2: Update app/config.py

**Location:** `/backend/app/config.py`

**Add new settings:**
```python
database_url: str = "postgresql://localuser:localpass@localhost:5432/budgetradar"
use_supabase: bool = False
supabase_url: str | None = None
supabase_service_key: str | None = None
```

**Copy full config.py code from PRD Phase 2 section.**

**Test:**
```bash
docker-compose exec backend python -c "from app.config import get_settings; print(get_settings().database_url)"
# Should print: postgresql://localuser:localpass@postgres:5432/budgetradar
```

#### Step 2.3: Create app/models/db_models.py

**Location:** `/backend/app/models/db_models.py` (new file)

**Critical:**
- Import `Integer` for impressions column: `from sqlalchemy import Column, Integer, ...`
- UNIQUE constraint: `UniqueConstraint('account_id', 'date', 'channel_name', name='uix_account_date_channel')`
- UUID handling: `from sqlalchemy.dialects.postgresql import UUID`

**Copy full db_models.py code from PRD Phase 2 section.**

**Test:**
```bash
docker-compose exec backend python -c "from app.models.db_models import Base; print(Base.metadata.tables.keys())"
# Should print: dict_keys(['accounts', 'daily_metrics', 'mmm_models', 'scenarios'])
```

#### Step 2.4: Create backend/migrations/001_init.sql

**Location:** `/backend/migrations/001_init.sql` (new file)

**Purpose:** Postgres auto-runs SQL files in `/docker-entrypoint-initdb.d` on first startup.

**Critical:**
- Use `CREATE TABLE IF NOT EXISTS` (not `CREATE TABLE`)
- Enable uuid-ossp extension: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- Schema MUST match Supabase version exactly (for future migration)

**Copy full SQL from PRD Phase 2 section.**

#### Step 2.5: Rename and Rewrite database.py

**Location:** `/backend/app/services/supabase_client.py` → `/backend/app/services/database.py`

**Actions:**
1. **Rename file:** `git mv app/services/supabase_client.py app/services/database.py`
2. **Delete all Supabase imports**
3. **Add SQLAlchemy imports:**
   ```python
   from sqlalchemy import create_engine, select
   from sqlalchemy.orm import sessionmaker, Session
   ```

**Key Functions to Rewrite:**

| Function | Old (Supabase) | New (SQLAlchemy) |
|----------|----------------|------------------|
| `fetch_daily_metrics` | `supabase.table('daily_metrics').select()` | `session.execute(select(DailyMetric.spend, DailyMetric.revenue).where(...))` |
| `save_model_params` | `supabase.table('mmm_models').upsert()` | Check if exists → update OR insert |

**Critical Pattern - Upsert Logic:**
```python
existing = session.execute(stmt).scalar_one_or_none()
if existing:
    existing.alpha = params.alpha  # Update
else:
    session.add(new_model)  # Insert
session.commit()
```

**Copy full database.py code from PRD Phase 2 section.**

**Test:**
```bash
docker-compose exec backend python -c "from app.services.database import init_db; init_db()"
# Should complete without errors
```

#### Step 2.6: Update app/routers/analysis.py

**Location:** `/backend/app/routers/analysis.py`

**Change ONE line:**
```python
# OLD
from app.services.supabase_client import (
    fetch_daily_metrics, ...
)

# NEW
from app.services.database import (
    fetch_daily_metrics, ...
)
```

**Rest of file unchanged.** Function signatures are identical.

#### Step 2.7: Update app/main.py

**Location:** `/backend/app/main.py`

**Add startup event:**
```python
from app.services.database import init_db

@app.on_event("startup")
async def startup():
    init_db()
```

**Why:** Ensures tables are created if 001_init.sql didn't run (e.g., if using SQLAlchemy DDL instead).

#### Step 2.8: Update scripts/seed_data.py

**Location:** `/backend/scripts/seed_data.py`

**Major rewrite required:**

**OLD pattern:**
```python
from app.services.supabase_client import get_supabase_client
supabase = get_supabase_client()
supabase.table('daily_metrics').insert({...}).execute()
```

**NEW pattern:**
```python
from app.services.database import get_session
from app.models.db_models import DailyMetric, Account

session = get_session()
metric = DailyMetric(account_id=..., date=..., ...)
session.add(metric)
session.commit()
session.close()
```

**Keep same data generation logic** (4 channels, 60 days, Hill Function curves).

**Test:**
```bash
docker-compose exec backend python scripts/seed_data.py
# Should output: ✅ Seeded 240 daily metrics for 4 channels
```

#### Step 2.9: Test Phase 2 End-to-End

**Commands:**
```bash
# 1. Restart containers (fresh database)
docker-compose down -v
docker-compose up --build

# 2. Verify tables created
docker-compose exec postgres psql -U localuser -d budgetradar -c "\dt"
# Should show: accounts, daily_metrics, mmm_models, scenarios

# 3. Verify seed data
docker-compose exec postgres psql -U localuser -d budgetradar -c "SELECT COUNT(*) FROM daily_metrics"
# Should show: count = 240 (4 channels × 60 days)

# 4. Test API endpoint
curl -X POST http://localhost:8000/api/analyze-channels \
  -H "Content-Type: application/json" \
  -d '{"account_id":"a8465a7b-bf39-4352-9658-4f1b8d05b381","target_cpa":50}'

# Should return JSON with 4 channels (Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads)

# 5. Open frontend
open http://localhost:3000
# Should see dashboard with 4 channels and traffic lights
```

**Regression Check:**
- Green light for Google Ads (high efficiency)
- Yellow light for Meta Ads (optimal)
- Red light for TikTok Ads (saturated)
- Grey light for LinkedIn Ads (insufficient data: 14 days < 21 minimum)

**If Any Test Fails:**
- Check Docker logs: `docker-compose logs backend`
- Verify SQLAlchemy models match SQL schema
- Check account_id UUID matches seed script: `a8465a7b-bf39-4352-9658-4f1b8d05b381`
- Verify frontend API_URL points to `http://localhost:8000`

**DO NOT PROCEED to Phase 3 until dashboard shows all 4 channels correctly.**

---

### Phase 3: CSV Upload Feature (2-3 hours)

#### Objective
Build drag-and-drop CSV import UI with validation.

#### Step 3.1: Create backend/app/routers/import.py

**Location:** `/backend/app/routers/import.py` (new file)

**Key Requirements:**
- Use `UploadFile` and `Form` from FastAPI
- Validate CSV columns: date, channel_name, spend, revenue (required)
- Handle optional impressions column
- Parse dates with pandas: `pd.to_datetime(df['date']).dt.date`
- Upsert logic to prevent duplicates
- Auto-create account if doesn't exist (for local mode)

**Validation Error Messages:**
```python
if not file.filename.endswith('.csv'):
    raise HTTPException(400, "File must be a CSV")

if missing:
    raise HTTPException(400, f"Missing required columns: {', '.join(missing)}")
```

**Copy full import.py code from PRD Phase 3 section.**

**Test:**
```bash
curl http://localhost:8000/api/import/template -o test_template.csv
cat test_template.csv
# Should show sample CSV with Google Ads and Meta Ads
```

#### Step 3.2: Update backend/app/main.py

**Location:** `/backend/app/main.py`

**Add import router:**
```python
from app.routers import analysis, import as import_router

app.include_router(analysis.router)
app.include_router(import_router.router)  # NEW LINE
```

**Restart backend:**
```bash
docker-compose restart backend
```

#### Step 3.3: Create frontend/src/app/import/page.tsx

**Location:** `/frontend/src/app/import/page.tsx` (new file)

**Structure:**
```typescript
'use client'  // CRITICAL for client-side state

export default function ImportPage() {
  return (
    <main>
      <h1>Import Marketing Data</h1>
      <CsvUploader accountId="..." />
      <Card>  {/* CSV Format Requirements */} </Card>
    </main>
  )
}
```

**Copy full page.tsx code from PRD Phase 3 section.**

#### Step 3.4: Create frontend/src/components/CsvUploader.tsx

**Location:** `/frontend/src/components/CsvUploader.tsx` (new file)

**Key Features:**
- File input with `accept=".csv"`
- FormData with both file and account_id
- Error state for validation failures
- Success state with stats (rows imported, channels detected)
- Link to dashboard after successful upload

**FormData Pattern:**
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('account_id', accountId)

const response = await fetch('http://localhost:8000/api/import/csv', {
  method: 'POST',
  body: formData,  // Do NOT set Content-Type header (browser auto-sets)
})
```

**Copy full CsvUploader.tsx code from PRD Phase 3 section.**

#### Step 3.5: Update frontend/src/app/layout.tsx

**Location:** `/frontend/src/app/layout.tsx`

**Add navigation header:**
```typescript
<header className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
    <h1 className="text-2xl font-bold text-gray-900">
      Marginal Efficiency Radar
    </h1>
    <nav className="flex gap-4">
      <a href="/" className="text-blue-600 hover:underline">Dashboard</a>
      <a href="/import" className="text-blue-600 hover:underline">Import Data</a>
    </nav>
  </div>
</header>
```

**Copy full navigation code from PRD Phase 3 section.**

#### Step 3.6: Test Phase 3 End-to-End

**Manual Test Flow:**
```bash
# 1. Navigate to import page
open http://localhost:3000/import

# 2. Download template CSV
# Click "Download example CSV template" link

# 3. Upload template CSV
# Drag template.csv into file input
# Click "Upload and Import"

# Expected: ✅ Import Successful
#   - Rows processed: 4
#   - Channels detected: Google Ads, Meta Ads
#   - Date range: 2025-01-01 to 2025-01-02

# 4. Click "→ View Dashboard"
# Should navigate to http://localhost:3000/
# Should see 2 new channels (Google Ads, Meta Ads) in addition to seed data

# 5. Test error handling
# Upload file with .txt extension
# Expected: ❌ File must be a CSV

# Upload CSV with missing 'spend' column
# Expected: ❌ Missing required columns: spend
```

**Curl Test (Alternative):**
```bash
curl -X POST http://localhost:8000/api/import/csv \
  -F "file=@test_template.csv" \
  -F "account_id=a8465a7b-bf39-4352-9658-4f1b8d05b381"

# Should return: {"success":true,"rows_imported":4,"channels":[...],"date_range":{...}}
```

**DO NOT PROCEED to Phase 4 until CSV upload works without errors.**

---

### Phase 4: Unified Developer Experience (1 hour)

#### Objective
Create Makefile for common development tasks.

#### Step 4.1: Create Makefile

**Location:** `/Makefile` (project root)

**Targets:**
- `help` (default) - Show available commands
- `install` - Run setup.sh
- `dev` - Start all services with `docker-compose up --build`
- `seed` - Re-run seed script in backend container
- `test` - Run pytest (backend) and npm test (frontend)
- `logs` - Stream logs from all containers
- `health` - Check if all services are responding
- `clean` - Stop containers and remove volumes

**Copy full Makefile from PRD Phase 4 section.**

**CRITICAL:** Makefile requires **tabs** not spaces for indentation. Ensure your editor preserves tabs.

#### Step 4.2: Test All Makefile Commands

```bash
# 1. Help command
make help
# Should display all available commands

# 2. Clean and restart
make clean
make dev
# Should stop old containers and start fresh

# 3. Seed database
make seed
# Should output: ✅ Seeded 240 daily metrics

# 4. Check health
make health
# Should show:
#   ✅ Backend healthy
#   ✅ Frontend healthy
#   ✅ Database healthy

# 5. View logs
make logs
# Should stream live logs (Ctrl+C to exit)
```

**If `make: command not found`:**
- macOS/Linux: Make is pre-installed, check PATH
- Windows: Use WSL2 or install Make for Windows

---

### Phase 5: Documentation & Polish (1-2 hours)

#### Objective
Update all documentation for local-first approach.

#### Step 5.1: Update README.md

**Location:** `/README.md`

**Structure:**
1. Title + tagline
2. 🚀 Quick Start (3 commands)
3. 📊 How It Works
4. 🏗️ Architecture
5. 📦 Commands (make dev, seed, test, clean)
6. 📁 CSV Format
7. 🔧 Configuration
8. 📖 Documentation (links to ARCHITECTURE.md, MIGRATION.md)
9. 🤝 Contributing
10. 📄 License

**Copy full README from PRD Phase 5 section.**

**Verify links work:**
```bash
# Check internal links
grep -o '\[.*\](\.\/.*\.md)' README.md
# All paths should exist
```

#### Step 5.2: Create ARCHITECTURE.md

**Location:** `/ARCHITECTURE.md` (project root)

**Content:**
- Docker Compose service diagram
- Volume mount explanation (why anonymous volume for node_modules)
- Database schema with table relationships
- SQLAlchemy abstraction layer
- Hill Function math overview (reference existing docs)
- Traffic light decision logic

**Create this file based on PRD technical architecture section.**

#### Step 5.3: Create docs/MIGRATION.md

**Location:** `/docs/MIGRATION.md` (new file)

**Content:**
- How to deploy to Supabase
- Set `USE_SUPABASE=true` in .env
- Supabase project setup steps
- Run migrations on Supabase
- Vercel deployment for frontend
- Environment variable configuration

**Explain backwards compatibility:** Same codebase works locally AND in cloud.

#### Step 5.4: Create docs/CSV_FORMAT.md

**Location:** `/docs/CSV_FORMAT.md` (new file)

**Content:**
- Required columns with data types
- Optional columns
- Date format (YYYY-MM-DD)
- Numeric format (no currency symbols, commas allowed)
- Example CSV with 30 days of data
- Validation rules
- Common errors and fixes

#### Step 5.5: Update CLAUDE.md

**Location:** `/CLAUDE.md`

**Changes:**
1. **Architecture section:** Add Docker Compose diagram
2. **Development Commands section:** Replace manual commands with `make dev`, `make seed`, etc.
3. **Database section:** Update from Supabase to PostgreSQL + SQLAlchemy
4. **Add CSV import instructions**
5. **Keep existing:** Hill Function math, traffic light rules, critical guardrails (21-day minimum, 10% increment)

---

### Final Testing & Validation (1 hour)

#### Test 1: Fresh Clone Experience

**Objective:** Verify < 2 minute startup for new users.

**Steps:**
```bash
# 1. Clone to new directory (simulate new user)
cd /tmp
git clone /path/to/budgetradar budgetradar-test
cd budgetradar-test

# 2. Start timer
time bash setup.sh

# 3. Start containers
time docker-compose up

# 4. Open browser
open http://localhost:3000

# Expected: Dashboard with 4 channels visible
# Total time: < 2 minutes (excluding Docker image download)
```

**Pass Criteria:**
- setup.sh completes in < 5 seconds
- docker-compose up shows all services healthy
- Dashboard loads with demo data
- All 4 channels show correct traffic lights

#### Test 2: CSV Import End-to-End

**Objective:** Verify CSV upload workflow.

**Steps:**
```bash
# 1. Create custom CSV
cat > custom_data.csv <<EOF
date,channel_name,spend,revenue,impressions
2025-02-01,Pinterest Ads,500.00,750.00,25000
2025-02-02,Pinterest Ads,550.00,825.00,27000
2025-02-03,Pinterest Ads,600.00,900.00,29000
EOF

# (Add 28 more days to reach 30 days minimum for modeling)

# 2. Upload via UI
open http://localhost:3000/import
# Upload custom_data.csv

# 3. Verify in dashboard
# Should see new "Pinterest Ads" channel with traffic light
```

**Pass Criteria:**
- Upload succeeds without errors
- New channel appears in dashboard
- Traffic light calculated correctly (likely grey if < 21 days)

#### Test 3: Offline Mode

**Objective:** Verify works without internet.

**Steps:**
```bash
# 1. Ensure Docker images are pulled
docker-compose pull

# 2. Disconnect internet
# (Disable wifi / unplug ethernet)

# 3. Restart containers
docker-compose down
docker-compose up

# 4. Test functionality
open http://localhost:3000
```

**Pass Criteria:**
- Containers start successfully
- Dashboard loads
- API calls work (all local)

#### Test 4: Regression Testing

**Objective:** Verify Hill Function math unchanged.

**Steps:**
```bash
# 1. Run existing tests (if any)
docker-compose exec backend pytest

# 2. Manual verification with seed data
curl -X POST http://localhost:8000/api/analyze-channels \
  -H "Content-Type: application/json" \
  -d '{"account_id":"a8465a7b-bf39-4352-9658-4f1b8d05b381","target_cpa":50}' \
  | jq '.channels[] | {channel: .channel_name, light: .traffic_light, marginal_cpa: .marginal_cpa}'

# Expected output (verify matches original behavior):
# Google Ads: green, marginal_cpa < 45
# Meta Ads: yellow, marginal_cpa ≈ 50
# TikTok Ads: red, marginal_cpa > 55
# LinkedIn Ads: grey, marginal_cpa = null
```

**Pass Criteria:**
- All tests pass
- Traffic lights match expected values
- Marginal CPA calculations within 1% of original

---

## Common Issues & Solutions

### Issue: `docker: command not found`
**Solution:** Install Docker Desktop from https://docker.com. This is a hard blocker.

### Issue: `Port already in use: 0.0.0.0:3000`
**Solution:** Change ports in docker-compose.yml:
```yaml
frontend:
  ports:
    - "3001:3000"  # Host:Container
```

### Issue: `backend_1 | connection refused`
**Solution:** Postgres healthcheck missing or failing. Verify:
```bash
docker-compose exec postgres pg_isready -U localuser
```

### Issue: `Module 'app.services.supabase_client' not found`
**Solution:** File not renamed properly. Check:
```bash
ls backend/app/services/database.py  # Should exist
```

### Issue: `No module named 'sqlalchemy'`
**Solution:** requirements.txt not updated or container not rebuilt:
```bash
docker-compose down
docker-compose up --build
```

### Issue: CSV upload shows `400 Missing required columns`
**Solution:** Check CSV headers exactly match:
```csv
date,channel_name,spend,revenue
```
(No spaces, lowercase, exact spelling)

### Issue: `frontend | npm ERR! enoent ENOENT: no such file or directory`
**Solution:** node_modules conflict. Ensure docker-compose.yml has:
```yaml
volumes:
  - ./frontend:/app
  - /app/node_modules  # Anonymous volume
```

---

## Completion Checklist

Before marking implementation complete:

### Functional Requirements
- [ ] `docker-compose up` starts all 3 services without errors
- [ ] Dashboard loads at http://localhost:3000 with 4 demo channels
- [ ] All 4 channels show correct traffic lights (green, yellow, red, grey)
- [ ] CSV upload works via /import page
- [ ] Uploaded data appears in dashboard within 10 seconds
- [ ] `make dev`, `make seed`, `make test`, `make clean` all work
- [ ] Works offline after initial Docker image pull

### Code Quality
- [ ] No Supabase imports remain in codebase
- [ ] SQLAlchemy models match Supabase schema exactly
- [ ] All existing Hill Function tests pass
- [ ] No hardcoded credentials (except default localuser/localpass)
- [ ] Error messages are user-friendly (no stack traces in UI)

### Documentation
- [ ] README.md has "60-second quickstart" section
- [ ] ARCHITECTURE.md explains Docker setup
- [ ] MIGRATION.md explains Supabase deployment
- [ ] CSV_FORMAT.md documents CSV requirements
- [ ] CLAUDE.md updated with new architecture
- [ ] All documentation links work

### Testing
- [ ] Fresh clone test passes (< 2 minute startup)
- [ ] CSV import test passes (custom data upload works)
- [ ] Offline test passes (no internet required)
- [ ] Regression test passes (Hill Function unchanged)

---

## Success Criteria

**Definition of Done:**

1. User runs: `git clone <repo> && cd budgetradar && bash setup.sh && docker-compose up`
2. Within 2 minutes, browser shows dashboard with 4 channels
3. User uploads CSV, sees new channel appear with traffic light
4. All tests in Final Testing section pass
5. No Docker knowledge required beyond "install Docker Desktop"

**Deliverable:** A working local-first application that preserves 100% of original functionality while eliminating cloud dependencies.

---

## Support & Escalation

If you encounter blocking issues during implementation:

1. **Document the blocker** - What step? What error? What was attempted?
2. **Check logs** - `docker-compose logs backend` or `docker-compose logs postgres`
3. **Verify assumptions** - Re-read PRD section for that phase
4. **Test in isolation** - Can backend connect to postgres directly?
5. **Git reset if needed** - Each phase should be committed separately

**Remember:** The goal is NOT to modify any business logic. If Hill Function behavior changes, you've gone wrong.

Good luck! 🚀
