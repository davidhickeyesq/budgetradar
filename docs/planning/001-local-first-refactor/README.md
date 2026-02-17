# Local-First Refactor - Planning Documentation

**Project:** Marginal Efficiency Radar v2.0.0
**Date:** 2026-02-15
**Status:** Ready for Implementation

---

## 📁 Folder Contents

This directory contains all planning documentation for the Local-First refactor of the Marginal Efficiency Radar project. An executing agent should read these files in order before beginning implementation.

### Core Documents

| File | Purpose | Read Order |
|------|---------|------------|
| **PRD.md** | Product Requirements Document - Complete project specification | 1st |
| **IMPLEMENTATION_GUIDE.md** | Step-by-step implementation instructions with code examples | 2nd |
| **TODO_CHECKLIST.md** | Detailed checklist with 180+ tasks organized by phase | 3rd |
| **EXECUTION_NOTES.md** | Quick reference, gotchas, and troubleshooting guide | 4th |
| **README.md** (this file) | Overview of planning documentation | Reference |

---

## 🎯 Project Overview

### Objective
Transform the Marginal Efficiency Radar from a cloud-dependent Supabase application into a **local-first** tool that runs with a single `docker-compose up` command.

### Key Goals
1. **One-Command Startup:** `docker-compose up` → working app at localhost:3000
2. **Zero Cloud Dependencies:** Local PostgreSQL replaces Supabase
3. **Instant Demo Data:** Auto-seed on first run
4. **CSV Upload:** Drag-and-drop interface for data import
5. **Preserve Math Quality:** Keep Python/scipy for Hill Function

### Success Criteria
- Fresh clone → working dashboard in **< 2 minutes**
- Works completely **offline** (no internet after Docker pull)
- Single `.env` file for all configuration
- All existing Hill Function tests **pass**
- Documentation shows "60-second quickstart"

---

## 📚 How to Use These Documents

### For the Executing Agent

**Before You Start:**
1. Read **PRD.md** completely (15-20 min)
   - Understand context, goals, and non-goals
   - Review technical architecture
   - Note critical file paths

2. Skim **IMPLEMENTATION_GUIDE.md** (10-15 min)
   - Understand 5-phase approach
   - Note testing strategy
   - Review common gotchas

3. Open **TODO_CHECKLIST.md** (keep open during work)
   - Check off tasks as you complete them
   - Track progress through 5 phases
   - Verify completion criteria

4. Keep **EXECUTION_NOTES.md** handy (reference as needed)
   - Quick command reference
   - Error message solutions
   - Verification checklists

**During Implementation:**
- Follow phases **sequentially** (1 → 2 → 3 → 4 → 5)
- Test after **every phase** (do not skip testing)
- Commit after **each phase** (for easy rollback)
- Mark checkboxes in **TODO_CHECKLIST.md** as you go

**If You Get Stuck:**
1. Check **IMPLEMENTATION_GUIDE.md** troubleshooting section
2. Review **EXECUTION_NOTES.md** for that phase
3. Read Docker logs: `docker-compose logs backend`
4. Test in isolation (can component X work independently?)

### For the Project Owner

**To Review the Plan:**
1. Read **PRD.md** - Understand scope and approach
2. Check **Success Criteria** section - Agree on definition of done
3. Review **Risk Assessment** section - Understand potential issues
4. Approve estimated timeline (9-12 hours)

**To Monitor Progress:**
- Ask implementing agent for **TODO_CHECKLIST.md** status
- Check git branch for phase commits
- Review "Phases Completed: X / 5" at bottom of TODO

**To Verify Completion:**
- Run **Final Testing** section from TODO_CHECKLIST.md
- Verify all **Completion Checklist** items checked
- Test "Fresh clone → dashboard in < 2 minutes"

---

## 🏗️ Architecture Summary

### Current State
```
Supabase Cloud (Postgres + Auth)
         ↕
Python FastAPI (localhost:8000)
         ↕
Next.js Frontend (localhost:3000)
```
**Issues:** Requires cloud account, 10+ setup steps, can't run offline

### Target State
```
┌─────────────────────────────────────┐
│     Docker Compose (one command)    │
├─────────────────────────────────────┤
│ Frontend │ Backend │ Postgres (local)│
│   :3000  │  :8000  │     :5432       │
└─────────────────────────────────────┘
```
**Benefits:** No cloud dependency, 1 setup step, works offline

### Key Changes
| Component | Before | After |
|-----------|--------|-------|
| Database | Supabase Cloud | PostgreSQL 15 (Docker) |
| DB Client | supabase-py | SQLAlchemy 2.0 |
| Auth | Supabase Auth + RLS | None (single-user local) |
| Orchestration | Manual (2 terminals) | Docker Compose |
| Configuration | Split .env files | Unified root .env |
| Data Ingestion | API integrations (planned) | CSV upload UI |

---

## 📋 Implementation Phases

### Phase 1: Docker Compose Infrastructure (2-3 hours)
- Create `docker-compose.yml` with 3 services
- Update `backend/Dockerfile` with postgres client
- Create `frontend/Dockerfile` for Next.js
- Create `.env.example` and `setup.sh`
- **Milestone:** All 3 containers start successfully

### Phase 2: Database Layer Abstraction (3-4 hours)
- Replace Supabase client with SQLAlchemy
- Create SQLAlchemy models matching Supabase schema
- Rewrite all database interaction functions
- Update seed script for SQLAlchemy
- **Milestone:** API returns same results as before

### Phase 3: CSV Upload Feature (2-3 hours)
- Create FastAPI endpoint for CSV processing
- Build React upload component with drag-and-drop
- Add validation and error handling
- Create import page with format requirements
- **Milestone:** CSV upload works end-to-end

### Phase 4: Unified Developer Experience (1 hour)
- Create Makefile with common commands
- Add `make dev`, `make seed`, `make test`, `make clean`
- **Milestone:** All make commands work

### Phase 5: Documentation & Polish (1-2 hours)
- Rewrite README.md for local-first approach
- Create ARCHITECTURE.md explaining Docker setup
- Create MIGRATION.md for Supabase deployment
- Create CSV_FORMAT.md with specifications
- Update CLAUDE.md with new architecture
- **Milestone:** Documentation is complete and accurate

---

## ⚠️ Critical Constraints

### DO NOT MODIFY
These contain core business logic that MUST remain unchanged:
- `backend/app/services/hill_function.py` - Hill Function math
- `frontend/src/components/TrafficLightRadar.tsx` - Visualization
- Traffic light thresholds (green/yellow/red/grey)
- 21-day minimum data requirement
- 10% increment rule for marginal CPA

### PRESERVE 100%
- Hill Function algorithm accuracy
- All existing unit tests must pass
- Traffic light logic unchanged
- Dashboard UI appearance identical

### REPLACE COMPLETELY
- Supabase client → SQLAlchemy ORM
- Cloud database → Local PostgreSQL
- Manual setup → Docker Compose

---

## 📊 Estimated Effort

| Phase | Time | Complexity | Risk |
|-------|------|------------|------|
| Phase 1 | 2-3 hours | Medium | Low |
| Phase 2 | 3-4 hours | High | Medium |
| Phase 3 | 2-3 hours | Medium | Low |
| Phase 4 | 1 hour | Low | Low |
| Phase 5 | 1-2 hours | Low | Low |
| **Total** | **9-12 hours** | **Medium-High** | **Low-Medium** |

### Risk Mitigation
- Test after every phase (catch issues early)
- Commit after every phase (easy rollback)
- Keep function signatures identical (minimize breaking changes)
- Use exact same database schema (enable future migration)

---

## ✅ Definition of Done

The refactor is complete when:

1. **Functional:** User runs `docker-compose up` and sees dashboard with 4 channels in < 2 minutes
2. **Tested:** All items in "Final Testing" section pass
3. **Documented:** README shows 60-second quickstart
4. **Verified:** No Supabase references in code or user-facing docs
5. **Regressed:** All existing Hill Function tests pass
6. **Offline:** Works without internet after initial setup

---

## 🚀 Quick Start for Executing Agent

```bash
# 1. Read all planning docs (30-40 min)
cd docs/planning
cat PRD.md IMPLEMENTATION_GUIDE.md TODO_CHECKLIST.md EXECUTION_NOTES.md

# 2. Create feature branch
git checkout -b feature/local-first-refactor

# 3. Start Phase 1
# (Follow IMPLEMENTATION_GUIDE.md Phase 1 section)

# 4. Commit after each phase
git add .
git commit -m "feat: [phase description]"

# 5. Run final tests (after Phase 5)
make clean && make dev
# Open http://localhost:3000

# 6. Mark complete in TODO_CHECKLIST.md
# "Phases Completed: 5 / 5"
```

---

## 📞 Support

### If Blocked
1. Review **IMPLEMENTATION_GUIDE.md** troubleshooting for your phase
2. Check **EXECUTION_NOTES.md** common errors section
3. Read Docker logs: `docker-compose logs backend`
4. Test component in isolation
5. Ask project owner for clarification

### Questions to Escalate
- Docker not installed (hard blocker)
- Port conflicts (need user input on which port to use)
- Supabase migration files missing (need source of truth)
- Test failures after Phase 2 (may need debugging time)

---

## 📄 File Structure

```
docs/planning/
├── README.md                    ← You are here
├── PRD.md                       ← Product Requirements Document
├── IMPLEMENTATION_GUIDE.md      ← Step-by-step instructions
├── TODO_CHECKLIST.md            ← 180+ task checklist
└── EXECUTION_NOTES.md           ← Quick reference & troubleshooting
```

---

## 🎓 Additional Context

### Related Documentation
- **Main README.md** (project root) - Will be rewritten in Phase 5
- **CLAUDE.md** (project root) - Will be updated in Phase 5
- **AGENTS.md** (project root) - Original architecture decisions
- **docs/project-context.md** - Hill Function math explanation

### Git Strategy
- **Main branch:** Keep as v1.x (Supabase version)
- **Feature branch:** `feature/local-first-refactor`
- **Tag on completion:** v2.0.0

### Backwards Compatibility
The refactored codebase will support BOTH local and cloud:
- Set `USE_SUPABASE=false` for local PostgreSQL (default)
- Set `USE_SUPABASE=true` for cloud Supabase (migration path)

Same code, two deployment modes!

---

## ✨ Final Notes

**This refactor is about infrastructure, not features.**

The Marginal Efficiency Radar's core value is the Hill Function math that calculates marginal CPA and identifies the efficiency wall. That math is **perfect as-is** and must not change.

The only goal is to make it **easier to use** by eliminating cloud setup friction.

**Success = Original functionality + Zero cloud dependencies**

Good luck! 🚀

---

**Prepared by:** Planning Agent (Claude Sonnet 4.5)
**Date:** 2026-02-15
**For:** Implementation Agent
**Version:** 2.0.0-planning
