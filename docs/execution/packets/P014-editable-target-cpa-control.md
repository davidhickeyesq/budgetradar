---
id: P014
title: Editable target CPA control + persistence
state: REVIEW
execution_status: In Review
owner: claude-code
branch: codex/p014-editable-target-cpa
pr:
depends_on: []
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P014-editable-target-cpa-control.md
---

# P014: Editable Target CPA Control + Persistence

## Goal

Remove the hardcoded `$50` target CPA in the dashboard and make target CPA
user-editable, persisted locally, and debounced for API calls.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P1)

## In Scope

- Replace `TARGET_CPA` constant with `targetCpa` React state.
- Persist target CPA via `localStorage`.
- Add `useDebounce` hook (`frontend/src/lib/hooks.ts`) and debounce request
  payload values.
- Update all analysis/scenario payload wiring to use state/debounced values.
- Render top-level Target CPA input bar in dashboard.

## Out of Scope

- Backend API or schema changes.
- Per-channel target CPA override model.
- Server-side account preference persistence.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/hooks.ts (new)

## Public API / Interface Changes

- No backend contract changes.
- Existing `target_cpa` request field becomes user-driven from UI state.

## Implementation Plan

1. Remove hardcoded `TARGET_CPA` constant and add `targetCpa` state with
   browser-safe localStorage initializer.
2. Add persistence effect for `targetCpa`.
3. Create and use `useDebounce(targetCpa, 500)` for API-facing values.
4. Replace all `TARGET_CPA` usages in analysis/scenario calls and props.
5. Update relevant hook dependency arrays to include debounced target CPA.
6. Add Target CPA input card above scenario controls.

## Edge Cases / Failure Modes

- SSR hydration path where `window` is unavailable.
- Invalid/blank numeric input causing NaN values.
- Excess re-fetches if debounced value is not used consistently.

## Tests

- Frontend:
  - target input updates analysis/scenario request payloads.
  - debounce prevents request-per-keystroke behavior.
  - refresh restores value from localStorage.
- Manual:
  - set target to `$30`, verify traffic light classification shifts.

## Acceptance Criteria

- [ ] Target CPA is editable in dashboard UI.
- [ ] Value persists across page reloads.
- [ ] API requests send updated `target_cpa`.
- [ ] Input changes are debounced to avoid API spam.

## Rollback Plan

- Revert to static target CPA constant.
- Remove localStorage and debounce wiring.
