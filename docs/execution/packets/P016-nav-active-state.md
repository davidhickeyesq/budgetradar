---
id: P016
title: Navigation active-state visibility
state: TODO
execution_status: Backlog
owner:
branch: codex/p016-nav-active-state
pr:
depends_on:
  - P015
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P016-nav-active-state.md
---

# P016: Navigation Active-State Visibility

## Goal

Show current page context in top navigation by replacing static anchor links with
pathname-aware client navigation.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P6)

## In Scope

- Create client `NavBar` component using `usePathname`.
- Highlight active route for dashboard/import pages.
- Replace `layout.tsx` inline nav links with `NavBar` component.

## Out of Scope

- New nav destinations.
- Header visual redesign beyond active-state styles.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/NavBar.tsx (new)
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/layout.tsx

## Public API / Interface Changes

- No backend/API changes.
- Client-side nav behavior only.

## Implementation Plan

1. Build `NavBar` as a client component with route metadata.
2. Compute active state from `usePathname()` for `/` and `/import`.
3. Swap `layout.tsx` nav markup with `<NavBar />`.
4. Remove obsolete inline `NavLink` helper.

## Edge Cases / Failure Modes

- Active-route false positives from `startsWith` behavior.
- Hydration mismatch if component is not client-marked.

## Tests

- Frontend:
  - dashboard route marks Dashboard active.
  - import route marks Import Data active.
- Manual:
  - confirm navigation stays client-side (no full-page reload).

## Acceptance Criteria

- [ ] Current page is visually obvious in nav.
- [ ] Navigation remains keyboard/mouse accessible.
- [ ] No routing regressions introduced.

## Rollback Plan

- Restore previous static nav links in `layout.tsx`.
