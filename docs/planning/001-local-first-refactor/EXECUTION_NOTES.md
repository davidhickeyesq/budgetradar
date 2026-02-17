# Execution Notes for Implementing Agent

**Date Created:** 2026-02-15
**Project:** Marginal Efficiency Radar - Local-First Refactor
**Prepared by:** Planning Agent

---

## Quick Reference

### Key Files Location
- **PRD:** `docs/planning/PRD.md`
- **Implementation Guide:** `docs/planning/IMPLEMENTATION_GUIDE.md`
- **TODO Checklist:** `docs/planning/TODO_CHECKLIST.md`
- **This File:** `docs/planning/EXECUTION_NOTES.md`

### Estimated Timeline
- **Total Time:** 9-12 hours
- **Phase 1:** 2-3 hours (Docker infrastructure)
- **Phase 2:** 3-4 hours (Database migration)
- **Phase 3:** 2-3 hours (CSV upload)
- **Phase 4:** 1 hour (Makefile)
- **Phase 5:** 1-2 hours (Documentation)

### Project Root
`/Users/davidhickey/Documents/Projects/budgetradar`

---

## Critical Principles

### DO NOT MODIFY
These files contain core business logic that MUST remain unchanged:
- `/backend/app/services/hill_function.py` - Hill Function math
- `/backend/app/models/schemas.py` - Pydantic request/response models
- `/frontend/src/types/index.ts` - UI type definitions
- `/frontend/src/components/TrafficLightRadar.tsx` - Visualization component
- `/frontend/src/app/page.tsx` - Main dashboard (except API URL if needed)

### MUST PRESERVE
- Hill Function algorithm (adstock, curve fitting, marginal CPA calculation)
- Traffic light logic (green/yellow/red/grey thresholds)
- 21-day minimum data requirement
- 10% increment rule for marginal CPA
- Parameter bounds (alpha: 0-0.8, beta: 0.5-3.0)

### REPLACE COMPLETELY
- `/backend/app/services/supabase_client.py` → Rename to `database.py` and rewrite
- `/backend/scripts/seed_data.py` - Rewrite for SQLAlchemy (keep same data generation)

### ADD NEW
- Root-level files: `docker-compose.yml`, `.env.example`, `setup.sh`, `Makefile`
- Backend: `app/models/db_models.py`, `app/routers/import.py`, `migrations/001_init.sql`
- Frontend: `Dockerfile`, `app/import/page.tsx`, `components/CsvUploader.tsx`
- Docs: `ARCHITECTURE.md`, `docs/MIGRATION.md`, `docs/CSV_FORMAT.md`

---

## Implementation Strategy

### Sequential vs Parallel Work

**Must be Sequential:**
- Phases 1-2-3-4-5 must be done in order
- Within Phase 2, file changes must follow dependency order:
  1. config.py (defines settings)
  2. db_models.py (defines models)
  3. database.py (uses models and settings)
  4. analysis.py (imports database)
  5. seed_data.py (uses database)

**Can be Parallel (within phase):**
- Phase 1: docker-compose.yml, Dockerfile updates, .env.example, setup.sh (independent)
- Phase 3: Backend import.py vs Frontend components (can develop simultaneously)
- Phase 5: All documentation files (independent)

### Testing Strategy

**Test After Every File Change:**
- Import statement: `docker-compose exec backend python -c "from app.X import Y"`
- Function call: `docker-compose exec backend python -c "from app.X import func; func()"`
- API endpoint: `curl http://localhost:8000/api/endpoint`

**Test After Every Phase:**
- Run full test suite in Phase testing section
- Do NOT proceed if any test fails
- If stuck, review logs: `docker-compose logs backend`

### Git Workflow

**Branch Strategy:**
```bash
git checkout -b feature/local-first-refactor
```

**Commit Strategy:**
- Phase 1: "feat: add Docker Compose infrastructure"
- Phase 2: "feat: migrate from Supabase to SQLAlchemy"
- Phase 3: "feat: add CSV upload feature"
- Phase 4: "feat: add Makefile for unified dev experience"
- Phase 5: "docs: update for local-first architecture"
- Final: "chore: tag v2.0.0 local-first release"

**DO NOT:**
- Commit to main branch
- Squash phase commits (keep separate for rollback)
- Push to remote until all phases complete and tested

---

## Technical Gotchas

### Docker Compose

**Gotcha:** Backend tries to connect to postgres before it's ready
**Solution:** Use healthcheck on postgres service + `depends_on: condition: service_healthy`

**Gotcha:** node_modules conflicts between host and container
**Solution:** Use anonymous volume: `/app/node_modules`

**Gotcha:** Changes not reflecting in container
**Solution:** Volume mounts for live reload: `./backend:/app`, `./frontend:/app`

### SQLAlchemy

**Gotcha:** UNIQUE constraint syntax differs from Supabase
**Solution:** Use `__table_args__ = (UniqueConstraint(...),)`

**Gotcha:** UUID handling requires special import
**Solution:** `from sqlalchemy.dialects.postgresql import UUID`

**Gotcha:** Upsert requires explicit logic
**Solution:** Query first, then update OR insert (no native upsert in SQLAlchemy < 1.4)

**Gotcha:** Session management causes "connection pool" errors
**Solution:** Always close sessions in finally block or use context manager

### FastAPI CSV Upload

**Gotcha:** UploadFile.read() moves pointer to end
**Solution:** Only read once, store in variable

**Gotcha:** FormData requires both File and Form parameters
**Solution:** `file: UploadFile = File(...), account_id: str = Form(...)`

**Gotcha:** Content-Type header set manually breaks multipart/form-data
**Solution:** Let browser auto-set Content-Type, don't specify in fetch()

### Next.js 16

**Gotcha:** Server components vs client components
**Solution:** Add `'use client'` directive for useState/useEffect

**Gotcha:** Absolute imports require tsconfig.json paths
**Solution:** Already configured: `@/*` → `./src/*`

**Gotcha:** CORS errors when calling backend
**Solution:** Backend CORS middleware already configured for localhost:3000

---

## Environment Variables

### Development (.env)
```bash
# Database (Docker service name for internal, localhost for external)
DATABASE_URL=postgresql://localuser:localpass@postgres:5432/budgetradar

# Feature flag
USE_SUPABASE=false

# Backend config
MIN_DATA_DAYS=21
MARGINAL_INCREMENT=0.10
ALPHA_MIN=0.0
ALPHA_MAX=0.8
ALPHA_STEP=0.1
BETA_MIN=0.5
BETA_MAX=3.0
MAX_YIELD_MULTIPLIER=3.0

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Testing
- **Inside backend container:** Use `postgres` as hostname
- **From host machine:** Use `localhost` as hostname
- **Frontend to backend:** Use `http://localhost:8000` (host network)

---

## Common Commands Reference

### Docker Compose
```bash
# Start all services
docker-compose up

# Start with rebuild
docker-compose up --build

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# View logs
docker-compose logs backend
docker-compose logs -f  # Follow mode

# Execute command in container
docker-compose exec backend bash
docker-compose exec postgres psql -U localuser -d budgetradar

# Restart single service
docker-compose restart backend
```

### Testing Commands
```bash
# Backend health
curl http://localhost:8000/api/health

# Analyze channels
curl -X POST http://localhost:8000/api/analyze-channels \
  -H "Content-Type: application/json" \
  -d '{"account_id":"a8465a7b-bf39-4352-9658-4f1b8d05b381","target_cpa":50}'

# Download CSV template
curl http://localhost:8000/api/import/template -o template.csv

# Check database
docker-compose exec postgres psql -U localuser -d budgetradar -c "\dt"
docker-compose exec postgres psql -U localuser -d budgetradar -c "SELECT COUNT(*) FROM daily_metrics"

# Check Postgres readiness
docker-compose exec postgres pg_isready -U localuser
```

### Debugging Commands
```bash
# Check container status
docker-compose ps

# Check networks
docker network ls
docker network inspect budgetradar_default

# Check volumes
docker volume ls

# Check port bindings
docker-compose port backend 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Inspect container
docker inspect budgetradar_backend_1

# Check Python imports
docker-compose exec backend python -c "from app.services.database import init_db; init_db()"

# Run seed script manually
docker-compose exec backend python scripts/seed_data.py
```

---

## Error Messages & Solutions

### "docker: command not found"
**Cause:** Docker not installed
**Solution:** Install Docker Desktop from https://docker.com
**Blocker:** Hard blocker, cannot proceed without Docker

### "Port already in use: 0.0.0.0:3000"
**Cause:** Another process using port
**Solution:** Either stop process (`lsof -ti:3000 | xargs kill`) or change port in docker-compose.yml
**Alternative:** Use different ports: `3001:3000` (host:container)

### "connection refused: postgres:5432"
**Cause:** Backend started before postgres ready
**Solution:** Add healthcheck to postgres service, use depends_on with condition

### "Module 'app.services.supabase_client' not found"
**Cause:** File not renamed or import not updated
**Solution:** Verify file renamed to database.py, check all imports updated

### "No module named 'sqlalchemy'"
**Cause:** requirements.txt not updated or container not rebuilt
**Solution:** `docker-compose down && docker-compose up --build`

### "node_modules/.bin/next: not found"
**Cause:** npm install didn't run or volume mount issue
**Solution:** Rebuild frontend container, verify anonymous volume for node_modules

### "UNIQUE constraint violation"
**Cause:** Duplicate daily metric entry
**Solution:** Verify seed script uses upsert logic or deletes old data first

### "Permission denied: setup.sh"
**Cause:** File not executable
**Solution:** `chmod +x setup.sh`

---

## Verification Checklist

Use this checklist at the end of each phase to verify correctness.

### Phase 1 Verification
```bash
✓ docker-compose up starts without errors
✓ Postgres log shows "database system is ready"
✓ Backend log shows "Uvicorn running on http://0.0.0.0:8000"
✓ Frontend log shows "ready - started server on 0.0.0.0:3000"
✓ curl http://localhost:8000/api/health returns 200
✓ curl http://localhost:3000 returns 200
✓ docker-compose exec postgres pg_isready succeeds
```

### Phase 2 Verification
```bash
✓ No import errors when starting backend
✓ Tables created: \dt shows 4 tables
✓ Seed data inserted: COUNT(*) FROM daily_metrics = 240
✓ API returns 4 channels (Google, Meta, TikTok, LinkedIn)
✓ Dashboard shows 4 channels with traffic lights
✓ Traffic lights: Google=green, Meta=yellow, TikTok=red, LinkedIn=grey
✓ No references to supabase_client in codebase
```

### Phase 3 Verification
```bash
✓ /import page loads without errors
✓ Template CSV downloads correctly
✓ CSV upload succeeds with valid file
✓ CSV upload fails with invalid file (correct error message)
✓ Uploaded data appears in dashboard
✓ Navigation links work (Dashboard ↔ Import)
```

### Phase 4 Verification
```bash
✓ make help displays commands
✓ make clean stops containers
✓ make dev starts containers
✓ make seed repopulates data
✓ make health shows all green
✓ make logs streams output
```

### Phase 5 Verification
```bash
✓ README.md has quickstart section
✓ All documentation links work (no 404s)
✓ CLAUDE.md updated with Docker commands
✓ Code examples in docs are accurate
```

---

## Data Expectations

### Seed Data (4 Channels)

| Channel | Days | Non-Zero Days | Traffic Light | Marginal CPA | Reasoning |
|---------|------|---------------|---------------|--------------|-----------|
| Google Ads | 60 | 60 | Green | ~$40 | High efficiency, below target |
| Meta Ads | 60 | 60 | Yellow | ~$50 | Optimal, at target |
| TikTok Ads | 60 | 60 | Red | ~$65 | Saturated, above target |
| LinkedIn Ads | 60 | 14 | Grey | null | Insufficient data (< 21 days) |

**Target CPA:** $50 (used in API calls and UI)

### Expected R² Values
- Google Ads: ~0.95 (strong fit)
- Meta Ads: ~0.92 (strong fit)
- TikTok Ads: ~0.89 (good fit)
- LinkedIn Ads: N/A (insufficient data)

### Hill Function Parameters (Approximate)
```python
# Google Ads (Green - high efficiency)
alpha = 0.3, beta = 1.2, kappa = 25000, max_yield = 800

# Meta Ads (Yellow - optimal)
alpha = 0.4, beta = 0.9, kappa = 20000, max_yield = 650

# TikTok Ads (Red - saturated)
alpha = 0.2, beta = 0.7, kappa = 15000, max_yield = 500

# LinkedIn Ads (Grey - insufficient)
No fit
```

These values are approximate and depend on the exact seed data generation logic.

---

## Performance Expectations

### Startup Times
- Docker image pull (first time): 3-5 minutes
- docker-compose up (cold): 30-60 seconds
- docker-compose up (warm): 10-20 seconds
- Seed script execution: 5-10 seconds
- Frontend first load: 2-5 seconds
- API analyze-channels: 1-3 seconds (4 channels)

### Resource Usage
- Total memory: ~1.5GB (postgres: 50MB, backend: 300MB, frontend: 150MB, Docker: 1GB)
- Total disk: ~2GB (images + volumes)
- CPU: Minimal (< 10% on modern machine)

---

## Success Criteria Summary

**Definition of Done:**

A user can:
1. Clone the repository
2. Run `bash setup.sh`
3. Run `docker-compose up`
4. See a working dashboard with 4 channels in < 2 minutes
5. Upload a CSV and see new channels appear
6. Run all `make` commands successfully
7. Understand how to use the tool from README alone

**No regressions:**
- Hill Function math produces identical results
- Traffic lights match original implementation
- All existing tests pass
- Dashboard UI looks identical

**Zero Supabase references:**
- No imports from supabase library
- No environment variables for Supabase (except optional for migration)
- No mention of Supabase in user-facing docs

---

## Post-Implementation Tasks

After all phases complete:

1. **Run full test suite**
   ```bash
   make clean
   make dev
   make test
   ```

2. **Fresh clone test**
   ```bash
   cd /tmp
   git clone /path/to/repo test-clone
   cd test-clone
   time bash setup.sh && time docker-compose up
   # Target: < 2 minutes to dashboard
   ```

3. **Offline test**
   ```bash
   docker-compose pull  # Ensure images downloaded
   # Disconnect internet
   docker-compose up
   # Verify everything works
   ```

4. **Documentation review**
   - Read README as first-time user
   - Follow quickstart exactly
   - Click all links
   - Test all code examples

5. **Git cleanup**
   ```bash
   git checkout main
   git merge feature/local-first-refactor
   git tag v2.0.0
   git push origin main --tags
   ```

6. **Update changelog** (if exists)
   - Document breaking changes
   - Migration guide from v1.x

---

## Rollback Procedure

If implementation fails and needs rollback:

1. **Return to main branch**
   ```bash
   git checkout main
   git branch -D feature/local-first-refactor
   ```

2. **Clean Docker artifacts**
   ```bash
   docker-compose down -v
   docker system prune -a
   ```

3. **Restore Supabase environment**
   ```bash
   cp backend/.env.example backend/.env
   # Add SUPABASE_URL and SUPABASE_SERVICE_KEY
   ```

4. **Restore original workflow**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload

   # New terminal
   cd frontend
   npm install
   npm run dev
   ```

---

## Questions to Ask User (If Blocked)

If you encounter any of these situations, ask the user:

1. **Docker not installed:** "Docker Desktop is not installed. Should I document this as a blocker and pause, or create all Docker files anyway for future use?"

2. **Port conflicts:** "Port 3000 is already in use. Should I change the frontend port to 3001, or would you like to free up port 3000 first?"

3. **Supabase migration files missing:** "I can't find supabase/migrations/20250101120000_init.sql to copy schema from. Should I recreate the schema from the existing Supabase client code, or do you have the migration file elsewhere?"

4. **Seed data results differ:** "The seed data is generating different traffic lights than expected. Should I adjust the Hill Function parameters to match the PRD expectations, or is this variance acceptable?"

5. **Test failures:** "Phase 2 tests are failing with error X. Should I debug this further (may take extra time), or proceed with a workaround?"

---

## Contact & Escalation

**Prepared by:** Planning Agent (Claude)
**Date:** 2026-02-15
**For questions about this plan:** Review PRD.md and IMPLEMENTATION_GUIDE.md first

**If stuck:**
1. Check IMPLEMENTATION_GUIDE.md troubleshooting section
2. Review logs: `docker-compose logs`
3. Test in isolation (can backend connect to postgres directly?)
4. Ask user for clarification (use questions above)

**Remember:** The goal is to maintain 100% functional parity with the original while changing only the infrastructure. When in doubt, preserve existing behavior.

Good luck! 🚀

---

## Final Status Update (2026-02-15)

### Execution Summary
The Local-First Refactor was successfully completed in a single session. All 5 phases were executed according to plan.

1. **Infrastructure**: Successfully containerized the application using Docker Compose. The  and  provide a seamless onboarding experience.
2. **Database Migration**: Replaced  with  + . The schema was replicated exactly in local PostgreSQL 15.
3. **Data Seeding**: Verified that  works deterministically. It now enforces a static Account ID (`a8465a7b-bf39-4352-9658-4f1b8d05b381`) to ensure the Frontend Demo mode works immediately upon startup.
4. **CSV Import**: Implemented a robust CSV upload feature using  and .
5. **Documentation**: Comprehensive documentation (, , ) is now up to date.

### Final Verification
- **Quickstart**: `make dev` boots the entire system in ~30s.
- **Functionality**: Dashboard loads correctly, Traffic Lights are accurate (Green/Yellow/Red/Grey).
- **Parity**: The logical core (Hill Function) remains untouched and fully functional.

**Next Steps:**
- The project is now ready for v2.0.0 release.
- Users can choose to deploy to Supabase by following `docs/MIGRATION.md` if cloud access is required.
