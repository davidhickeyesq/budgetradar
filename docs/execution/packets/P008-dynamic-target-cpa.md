---
id: P008
title: Per-entity target CPA contracts and UI
state: TODO
execution_status: Backlog
owner:
branch: codex/p008-dynamic-target-cpa
pr:
depends_on:
  - P009
updated_at: 2026-02-23
issue: https://github.com/davidhickeyesq/budgetradar/issues/32
project_item: PVTI_lAHOACofT84BPcnczgl72eU
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P008-dynamic-target-cpa.md
---

# P008: Per-Entity Target CPA Contracts and UI

## Goal

Replace the single global target CPA workflow with per-entity targets (channel
first, campaign-capable) while preserving backward compatibility for scalar
clients.

## In Scope

- Extend analysis/scenario request contracts with `target_cpa_overrides`.
- Add UI controls for per-entity target input/edit.
- Recompute classification and scenario logic per entity.
- Preserve scalar `target_cpa` default behavior when overrides are omitted.

## Out of Scope

- Persistent user settings service (session/local persistence only is allowed).
- Multi-objective optimization beyond target-CPA policy.
- Platform deployment automation.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/scenarios.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/types/index.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx

## Public API / Interface Changes

- Request additions:
  - `target_cpa_overrides: [{ entity_type, entity_key, target_cpa }]`
- Response additions:
  - `effective_target_cpa` per entity
  - optional `target_source: "default" | "override"`
- Compatibility:
  - if `target_cpa_overrides` absent, use scalar `target_cpa`.

## Implementation Plan

1. Introduce override schema models and validation rules.
2. Add backend resolver for effective target per entity.
3. Update analysis/scenario response payload with effective target metadata.
4. Add editable UI target controls and change handlers.
5. Wire UI payload to backend and update chart/traffic-light rendering.

## Edge Cases / Failure Modes

- Override references unknown entity keys.
- Duplicate override records for same entity.
- Mixed entity types during phased rollout (channel + campaign).

## Tests

- Backend:
  - scalar-only requests produce unchanged outputs.
  - override resolution precedence is deterministic.
  - invalid override payloads return clear validation errors.
- Frontend:
  - per-entity target edits propagate to API requests.
  - recalculation updates status badges and chart target lines.

## Acceptance Criteria

- [ ] Users can set distinct target CPAs for at least two entities in one run.
- [ ] Traffic lights and scenario recommendations use effective per-entity targets.
- [ ] Scalar-only clients remain fully compatible.

## Rollback Plan

- Feature-flag override handling off and fall back to scalar targets.
- Keep additive request fields optional.
