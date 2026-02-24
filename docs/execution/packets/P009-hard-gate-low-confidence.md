---
id: P009
title: Confidence policy and gating semantics
state: REVIEW
execution_status: In Review
owner: codex
branch: codex/p009-hard-gate-low-confidence
pr: https://github.com/davidhickeyesq/budgetradar/pull/40
depends_on:
  - P006
updated_at: 2026-02-24
issue: https://github.com/davidhickeyesq/budgetradar/issues/36
project_item: PVTI_lAHOACofT84BPcnczgl_pNE
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P009-hard-gate-low-confidence.md
---

# P009: Confidence Policy and Gating Semantics

## Goal

Turn confidence handling from advisory UI messaging into explicit, enforceable
product policy without breaking existing traffic-light meaning.

## In Scope

- Define and implement `data_quality_state` in analysis/scenario responses:
  - `ok`, `low_confidence`, `insufficient_history`
- Add configurable confidence threshold (default policy value).
- Enforce deterministic scenario handling for low-confidence entities:
  - either `hold` or `block` based on policy.
- Keep `traffic_light` tied to efficiency status only.

## Out of Scope

- Changing Hill fitting algorithm family.
- Reinterpreting `grey` as confidence failure.
- New external observability tooling.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/config.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/scenarios.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/hill_function.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/types/index.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx

## Public API / Interface Changes

- Analysis payload extension:
  - `data_quality_state: "ok" | "low_confidence" | "insufficient_history"`
  - optional `data_quality_reason: string`
- Scenario recommendation payload extension:
  - `data_quality_state`
  - `is_action_blocked: boolean`
  - `blocked_reason: string | null`
- Add config setting:
  - `MIN_CONFIDENCE_R_SQUARED` (default value documented)

## Implementation Plan

1. Add response schema fields for quality state and blocking metadata.
2. Implement policy evaluation in backend analysis/scenario services.
3. Enforce deterministic planner behavior for low-confidence entities.
4. Render explicit "Low Confidence" state in UI without overloading grey.
5. Document policy defaults and operator implications.

## Edge Cases / Failure Modes

- Borderline threshold jitter around exact cutoff values.
- Legacy clients ignoring new fields.
- Confusion between insufficient-history and low-confidence states.

## Tests

- Backend:
  - threshold edge tests (`==`, `<`, `>` cutoff).
  - scenario behavior under blocked/hold policy.
  - backward-compatible payload parsing.
- Frontend:
  - state badges render correctly for all quality states.
  - blocked actions display clear rationale.

## Acceptance Criteria

- [ ] API exposes explicit `data_quality_state`.
- [ ] Low-confidence entities follow deterministic scenario policy.
- [ ] `grey` remains reserved for insufficient-history semantics.
- [ ] UI communicates quality state and blocked actions clearly.

## Rollback Plan

- Revert to advisory-only confidence warnings.
- Keep additive schema fields optional to avoid client breakage.
