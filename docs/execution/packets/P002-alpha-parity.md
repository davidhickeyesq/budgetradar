---
id: P002
title: Alpha parity
state: REVIEW
execution_status: In Review
owner: codex
branch: codex/p002-alpha-parity
pr: https://github.com/davidhickeyesq/budgetradar/pull/21
depends_on:
  - P001
updated_at: 2026-02-18
issue: https://github.com/davidhickeyesq/budgetradar/issues/16
project_item: PVTI_lAHOACofT84BPcnczgloLM0
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P002-alpha-parity.md
---

# P002: Alpha-Aware Marginal CPA + Chart Parity

## Goal

Ensure fitted adstock `alpha` is actually used in marginal CPA evaluation and
chart visualization so outputs match the fitted model assumptions.

## In Scope

- Update backend marginal path to incorporate adstock state.
- Return backend-generated chart points using alpha-aware math.
- Remove frontend-side independent curve generation drift.

## Out of Scope

- Changing traffic-light thresholds.
- Changing base Hill fit search space/bounds.
- Introducing new optimization algorithms.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/hill_function.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CostCurveChart.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/types/index.ts

## Public API / Interface Changes

- Extend analysis response for each channel with backend chart payload:
  - `curve_points: [{ spend, marginal_cpa, zone }]`
  - `current_point: { spend, marginal_cpa }`
- Existing fields remain intact for compatibility.

## Implementation Plan

1. Define alpha-aware marginal CPA helper using history-aware adstock context.
2. Add backend curve point generator consistent with helper.
3. Include curve payload in `analyze-channels` response.
4. Update frontend chart component to consume API-provided curve payload.
5. Keep fallback rendering for legacy payloads while migrating.

## Edge Cases / Failure Modes

- Sparse data channels where curve payload is empty.
- Numerical instability when conversions are nearly flat.
- Channels with zero/near-zero current spend.

## Tests

- Backend:
  - alpha impacts marginal result for same beta/kappa/max_yield.
  - response includes curve payload structure and valid zone values.
- Frontend:
  - chart renders with backend points only.
  - current marker matches backend `current_point`.

## Acceptance Criteria

- [ ] Alpha affects computed marginal CPA.
- [ ] Chart and backend metrics are generated from the same model math.
- [ ] No local frontend hill/marginal recomputation remains as primary path.
- [ ] Existing API consumers do not break.

## Rollback Plan

- Revert payload additions and frontend chart consumption.
- Keep current backend scalar marginal path only.
