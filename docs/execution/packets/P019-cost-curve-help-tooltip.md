---
id: P019
title: Cost-curve help tooltip for non-technical users
state: REVIEW
execution_status: In Review
owner: claude-code
branch: codex/p019-cost-curve-help-tooltip
pr:
depends_on:
  - P018
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P019-cost-curve-help-tooltip.md
---

# P019: Cost-Curve Help Tooltip for Non-Technical Users

## Goal

Improve chart comprehension by adding an inline explainer for the marginal CPA
curve and green/yellow/red efficiency zones.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P5)

## In Scope

- Add info button in channel analysis header.
- Toggle contextual help panel with zone definitions and marker explanation.
- Ensure copy aligns with AGENTS.md traffic-light rules and efficiency-wall
  framing.

## Out of Scope

- Chart data model or rendering algorithm changes.
- New analytics metrics or derived confidence math.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx

## Public API / Interface Changes

- No API changes.
- New dashboard help affordance and explanatory content.

## Implementation Plan

1. Add `showHelp` toggle state in `TrafficLightRadar`.
2. Add info button near "Channel Analysis" title.
3. Render conditional help panel with stable, canonical terminology.
4. Ensure panel can be dismissed and does not disrupt chart layout.

## Edge Cases / Failure Modes

- Help panel overflows on narrow screens.
- Explanatory text drifts from traffic-light thresholds.

## Tests

- Frontend:
  - info control toggles help panel visibility.
  - help content renders without clipping in common breakpoints.
- Manual:
  - verify wording matches traffic-light semantics.

## Acceptance Criteria

- [ ] Users can open/close a clear chart explainer.
- [ ] Zone explanations are accurate and readable.
- [ ] Existing chart interactions remain stable.

## Rollback Plan

- Remove help button/panel and restore prior header-only view.
