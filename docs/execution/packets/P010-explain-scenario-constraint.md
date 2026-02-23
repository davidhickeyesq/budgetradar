---
id: P010
title: Scenario step constraint UX clarity
state: TODO
execution_status: Backlog
owner:
branch: codex/p010-explain-scenario-constraint
pr:
depends_on:
  - P005
updated_at: 2026-02-23
issue: https://github.com/davidhickeyesq/budgetradar/issues/34
project_item: PVTI_lAHOACofT84BPcnczgl_pM0
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P010-explain-scenario-constraint.md
---

# P010: Scenario Step Constraint UX Clarity

## Goal

Make the 10% scenario step behavior understandable to operators so it is seen as
an intentional stability rule, not an arbitrary product limitation.

## In Scope

- Add inline help text and tooltip content in the scenario planner UI.
- Explain the numerical-stability reason for 10% steps in operator language.
- Add documentation note that links UX copy to AGENTS.md math canon.

## Out of Scope

- Any changes to `MARGINAL_INCREMENT` or scenario simulation logic.
- Exact-dollar solver implementation.
- Changes to traffic-light thresholds or cold-start rules.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/README.md

## Public API / Interface Changes

- No backend API contract changes.
- UI copy/tooltip additions only.

## Implementation Plan

1. Add persistent explanatory helper text near `Budget Delta (%)` controls.
2. Add tooltip or info affordance with concise rationale:
   "Budget moves are simulated in fixed 10% steps to preserve marginal-curve
   numerical stability."
3. Ensure copy appears in desktop and mobile layouts without clipping.
4. Update docs to mirror the same wording and remove any ambiguous phrasing.

## Edge Cases / Failure Modes

- Help text overcrowds controls on narrow screens.
- Copy drift between UI and docs over time.

## Tests

- Frontend:
  - verify helper text renders in planner area.
  - verify tooltip opens/closes with keyboard and pointer interactions.
- Manual:
  - mobile viewport check for readability and wrapping.

## Acceptance Criteria

- [ ] Scenario planner clearly explains why 10% steps are used.
- [ ] No simulation math behavior changes.
- [ ] Copy is consistent with AGENTS.md numerical-stability guidance.

## Rollback Plan

- Remove helper text/tooltip if UX regression occurs.
- Keep scenario logic unchanged.
