---
id: P028
title: Update StepIndicator for 3-route mapping + clickable links
state: DONE
execution_status: Done
owner: claude-code
branch: codex/p028-step-indicator-routes
pr: ""
depends_on:
  - P026
updated_at: 2026-02-26
issue: ""
project_item: ""
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P028-step-indicator-routes.md
---

# P028: Update StepIndicator for 3-Route Mapping + Clickable Links

## Goal

Make the step indicator reflect the actual 3-page flow and make steps clickable
navigation links.

## In Scope

- Update step resolution: `/import` → step 0, `/` → step 1, `/plan` → step 2.
- Add `href` to STEPS array: import→`/import`, review→`/`, plan→`/plan`, export→`/plan`.
- Wrap each step in a `<Link>` from `next/link`.
- Import `Link` from `next/link`.

## Out of Scope

- No visual style changes.
- No new routes.

## Files Expected to Change

- `frontend/src/components/StepIndicator.tsx`

## Public API / Interface Changes

- None.

## Implementation Plan

1. Add `href` field to each STEPS entry.
2. Update `currentStep` logic for 3 routes.
3. Wrap step `<span>` elements in `<Link>` components.
4. Verify all 3 routes show correct step highlighting.

## Tests

- Manual: verify each route highlights the correct step.
- Manual: verify clicking steps navigates to correct route.

## Acceptance Criteria

- [ ] `/import` highlights step 1, `/` highlights step 2, `/plan` highlights step 3.
- [ ] Steps are clickable links to correct routes.
- [ ] Previous steps show checkmark (✓).

## Rollback Plan

- Revert to 2-state step indicator.
