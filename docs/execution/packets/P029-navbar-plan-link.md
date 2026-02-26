---
id: P029
title: Add Plan to NavBar
state: DONE
execution_status: Done
owner: claude-code
branch: codex/p029-navbar-plan-link
pr: ""
depends_on:
  - P026
updated_at: 2026-02-26
issue: ""
project_item: ""
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P029-navbar-plan-link.md
---

# P029: Add Plan to NavBar

## Goal

Add the `/plan` route to the header navigation bar.

## In Scope

- Add `{ href: '/plan', label: 'Plan' }` to NAV_ITEMS between Dashboard and Import Data.

## Out of Scope

- No style changes.
- No new routes.

## Files Expected to Change

- `frontend/src/components/NavBar.tsx`

## Public API / Interface Changes

- None.

## Implementation Plan

1. Add "Plan" entry to NAV_ITEMS array at index 1.
2. Verify active state highlights correctly on `/plan`.

## Tests

- Manual: NavBar shows "Dashboard | Plan | Import Data".
- Manual: active state correct on each route.

## Acceptance Criteria

- [ ] NavBar shows "Dashboard | Plan | Import Data".
- [ ] Active state highlights correctly on each route.

## Rollback Plan

- Remove the Plan entry from NAV_ITEMS.
