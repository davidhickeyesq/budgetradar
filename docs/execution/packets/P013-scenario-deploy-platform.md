---
id: P013
title: Scenario deploy-to-platform
state: TODO
execution_status: Backlog
owner:
branch: codex/p013-scenario-deploy-platform
pr:
depends_on:
  - P011
  - P012
  - P005
updated_at: 2026-02-23
issue: https://github.com/davidhickeyesq/budgetradar/issues/38
project_item: PVTI_lAHOACofT84BPcnczgl_pM4
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P013-scenario-deploy-platform.md
---

# P013: Scenario Deploy-to-Platform

## Goal

Close the execution loop by enabling approved scenario plans to update live ad
platform budgets with auditability and safety controls.

## In Scope

- Add deploy endpoint for scenario execution (dry-run + live mode).
- Add execution audit trail with per-entity success/failure records.
- Add frontend deploy action in planner workflow with confirmation UX.
- Add idempotency and partial-failure handling rules.

## Out of Scope

- Automatic multi-day re-optimization loops.
- Cross-platform budget orchestration beyond Google Ads.
- Advanced rollback math/reallocation strategies.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/db_models.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/scenarios.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/google_ads_provider_real.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/migrations/*
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx

## Public API / Interface Changes

- New endpoint:
  - `POST /api/scenarios/{scenario_id}/deploy`
- Request flags:
  - `mode: "dry_run" | "live"`
  - optional `idempotency_key`
- Response:
  - deployment status
  - per-entity result entries
  - failure reasons and retryability hints

## Implementation Plan

1. Add deployment tracking tables/models and schema migration.
2. Implement backend deploy service with dry-run and live execution paths.
3. Integrate provider update calls for entity-level budget writes.
4. Add UI confirmation and deployment status feedback in planner.
5. Add retry/idempotency behavior and audit query endpoint if required.

## Edge Cases / Failure Modes

- Scenario references stale entities no longer active in platform.
- Partial write failure across multiple entities.
- Duplicate deploy requests from repeated button clicks.

## Tests

- Backend:
  - dry-run returns deterministic non-mutating results.
  - live mode records per-entity outcomes and handles partial failures.
  - idempotency key prevents duplicate executions.
- Frontend:
  - deploy confirmation and status rendering are clear and resilient.

## Acceptance Criteria

- [ ] User can run dry-run and live deploy separately.
- [ ] Deployment response includes per-entity success/failure with reasons.
- [ ] Deployment history is auditable for incident review.

## Rollback Plan

- Disable live deploy mode and keep dry-run only.
- Retain deployment records for traceability.
