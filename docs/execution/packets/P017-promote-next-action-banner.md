---
id: P017
title: Promote top-level "What To Do Now" action banner
state: TODO
execution_status: Backlog
owner:
branch: codex/p017-promote-next-action-banner
pr:
depends_on:
  - P016
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P017-promote-next-action-banner.md
---

# P017: Promote Top-Level "What To Do Now" Action Banner

## Goal

Surface the most actionable recommendation (`nextActionSummary`) at the top of
the dashboard so users see next steps before interacting with planner controls.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P4)

## In Scope

- Add top-level action banner above scenario planner.
- Show projected net spend delta summary in banner.
- Add muted placeholder state while scenario recommendation is generating.

## Out of Scope

- Scenario recommendation algorithm changes.
- Scenario save/load behavior changes.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx

## Public API / Interface Changes

- No API changes.
- New high-priority dashboard presentation block.

## Implementation Plan

1. Render top-level conditional banner when `scenarioPlan` and
   `nextActionSummary` are available.
2. Include projected spend delta line with sign and locale formatting.
3. Render loading placeholder when scenario is generating and plan is absent.
4. Keep existing planner internals intact.

## Edge Cases / Failure Modes

- Banner displays stale summary after regeneration.
- Placeholder flashes unnecessarily during quick loads.

## Tests

- Frontend:
  - banner appears with valid scenario output.
  - banner updates after rerun with new budget delta.
- Manual:
  - loading placeholder appears only in expected state.

## Acceptance Criteria

- [ ] "What To Do Now" summary is visible near top of dashboard.
- [ ] Banner reflects current scenario output.
- [ ] Loading placeholder behaves correctly.

## Rollback Plan

- Remove top-level banner and keep guidance inside planner section only.
