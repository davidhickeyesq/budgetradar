---
id: P022
title: Dashboard structural loading skeleton
state: REVIEW
execution_status: In Review
owner: claude-code
branch: codex/p022-dashboard-loading-skeleton
pr: https://github.com/davidhickeyesq/budgetradar/pull/50
depends_on:
  - P021
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P022-dashboard-loading-skeleton.md
---

# P022: Dashboard Structural Loading Skeleton

## Goal

Replace spinner-only loading state with structural skeleton placeholders that
mirror the final dashboard layout.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P9)

## In Scope

- Replace current loading spinner block in dashboard route.
- Add skeleton placeholders for target input card, action banner, channel cards,
  and summary panel.
- Ensure skeleton layout matches post-reorder dashboard structure.

## Out of Scope

- Data-fetching strategy changes.
- Scenario generation loading logic changes beyond visual placeholder block.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx

## Public API / Interface Changes

- No API changes.
- Visual loading-state presentation only.

## Implementation Plan

1. Replace spinner branch with card/grid skeleton blocks.
2. Use existing Tailwind pulse utilities for placeholder animation.
3. Match skeleton structure to live layout sections and spacing.
4. Validate transition from loading skeleton to loaded content.

## Edge Cases / Failure Modes

- Skeleton layout diverges from actual UI after future changes.
- Excessive animation causing perceived jank on low-end devices.

## Tests

- Frontend:
  - loading branch renders skeleton structure.
  - loaded branch fully replaces skeleton markup.
- Manual:
  - throttle network and verify perceived stability during load.

## Acceptance Criteria

- [ ] Spinner-only state is removed.
- [ ] Skeleton placeholders reflect final dashboard structure.
- [ ] Loading-to-loaded transition is visually stable.

## Rollback Plan

- Revert to prior spinner-based loading block.
