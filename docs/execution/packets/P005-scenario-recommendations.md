---
id: P005
title: Scenario recommendations
state: REVIEW
execution_status: In Review
owner: codex
branch: codex/p005-scenario-recommendations
pr: https://github.com/davidhickeyesq/budgetradar/pull/28
depends_on:
  - P004
updated_at: 2026-02-22
issue: https://github.com/davidhickeyesq/budgetradar/issues/24
project_item: PVTI_lAHOACofT84BPcnczgl7EUo
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P005-scenario-recommendations.md
---

# P005: Scenario Recommendations

## Goal

Convert channel traffic-light output into actionable budget moves by generating
saved scenario recommendations backed by marginal CPA math.

## In Scope

- Add scenario recommendation service that proposes per-channel spend deltas.
- Use 10% spend step increments for recommendation simulation consistency.
- Add API endpoints to generate and persist scenarios in `scenarios`.
- Add frontend scenario planner view consuming recommendation payloads.
- Provide recommendation rationale tied to target CPA thresholds.

## Out of Scope

- Automatic budget push to ad platforms.
- Campaign/ad-group-level optimization.
- Cross-account portfolio optimization.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/db_models.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/hill_function.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/database.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/scenarios.py (new)
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/main.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/types/index.ts
- /Users/davidhickey/Documents/Projects/budgetradar/README.md

## Public API / Interface Changes

- Add `POST /api/scenarios/recommend`
  - Request:
    `{ account_id, target_cpa, budget_delta_percent?, locked_channels? }`
  - Response:
    `{ scenario_name, recommendations[], projected_summary }`
- Add `POST /api/scenarios` to persist a recommendation.
- Add `GET /api/scenarios/{account_id}` to list saved scenarios.

## Implementation Plan

1. Add scenario request/response schemas and persistence helpers.
2. Implement recommendation engine based on marginal CPA with 10% spend steps.
3. Add scenario router endpoints for generate/save/list flows.
4. Expose recommendation summaries on dashboard planner panel.
5. Add API + UI tests and update docs with planner workflow.

## Edge Cases / Failure Modes

- All channels are red (no efficient expansion candidate).
- Too few channels with sufficient data to support reallocations.
- Budget decrease scenario where all channels already near minimum spend.
- Locked channels consume entire budget envelope.

## Tests

- Backend:
  - deterministic recommendation output for fixed fixture.
  - saved scenario roundtrip returns expected allocation payload.
  - recommendation still honors traffic-light thresholds.
- Frontend:
  - planner renders recommendations and projected summary.
  - save/load scenario interactions call correct API paths.
- Manual:
  - generate scenario from seeded data and confirm spend deltas are coherent.

## Acceptance Criteria

- [ ] API returns channel-level spend delta recommendations with rationale.
- [ ] Recommendations use 10% spend-step simulation logic.
- [ ] Scenarios can be persisted and reloaded from DB.
- [ ] Dashboard provides actionable "move budget from X to Y" guidance.
- [ ] Planner flow is documented for local-first users.

## Rollback Plan

- Remove scenario endpoints and planner UI.
- Keep existing analysis-only traffic-light output path.
- Preserve `scenarios` table without active runtime usage.
