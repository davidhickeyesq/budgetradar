---
id: P023
title: Mobile responsiveness polish for planner and charts
state: REVIEW
execution_status: In Review
owner: claude-code
branch: codex/p023-mobile-responsive-polish
pr:
depends_on:
  - P022
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P023-mobile-responsive-polish.md
---

# P023: Mobile Responsiveness Polish for Planner and Charts

## Goal

Finish UX plan rollout with mobile breakpoint polish for planner controls,
recommendation cards, and chart legend behavior.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P10)

## In Scope

- Tighten budget delta preset button sizing for small screens.
- Adjust recommendation card grid breakpoints for phone/tablet flow.
- Add chart legend wrapping to prevent horizontal overflow.
- Confirm chart height behavior on mobile (retain 300px or apply responsive
  class based on implementation choice).

## Out of Scope

- New mobile-specific feature sets.
- Dark mode or full visual redesign work.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CostCurveChart.tsx (if responsive height adjustment is implemented)

## Public API / Interface Changes

- No API changes.
- Responsive layout and spacing updates only.

## Implementation Plan

1. Apply responsive button spacing for budget delta controls.
2. Update recommendation grid to `sm:grid-cols-2` for earlier two-column layout.
3. Add `flex-wrap` to chart legend rows.
4. Verify/adjust chart height strategy for 375px/640px/768px widths.
5. Validate no horizontal overflow across key pages.

## Edge Cases / Failure Modes

- Wrapping legend labels overlap chart content.
- Responsive class changes introduce regressions on desktop spacing.

## Tests

- Manual viewport checks at 375px, 640px, 768px.
- Frontend sanity checks:
  - no horizontal scrollbar.
  - controls remain tappable and legible.

## Acceptance Criteria

- [ ] Small-screen layouts do not overflow horizontally.
- [ ] Planner controls and recommendation cards remain readable on phones.
- [ ] Chart legend wraps cleanly at narrow widths.

## Rollback Plan

- Revert responsive class changes on affected components.
