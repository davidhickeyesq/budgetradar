---
id: P025
title: Extract ScenarioActionCenter into standalone component
state: TODO
execution_status: Backlog
owner: ""
branch: codex/p025-extract-scenario-action-center
pr: ""
depends_on:
  - P024
updated_at: 2026-02-26
issue: ""
project_item: ""
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P025-extract-scenario-action-center.md
---

# P025: Extract ScenarioActionCenter into Standalone Component

## Goal

Extract the `ScenarioActionCenter` nested function from `page.tsx` into its own
component file so it can be imported by both `/` and `/plan` pages.

## In Scope

- Create `frontend/src/components/ScenarioActionCenter.tsx`.
- Move `ScenarioActionCenterProps` interface (page.tsx L1061-1089).
- Move `ScenarioActionCenter` function (page.tsx L1091-1383).
- Add `'use client'` directive.
- Import helpers from `@/lib/scenario-helpers`.
- Update `page.tsx` to import from `@/components/ScenarioActionCenter`.

## Out of Scope

- No behavioral changes. No new routes.
- Props interface stays identical.

## Files Expected to Change

- `frontend/src/components/ScenarioActionCenter.tsx` (NEW)
- `frontend/src/app/page.tsx` (remove nested function, add import)

## Public API / Interface Changes

- No backend API changes.
- New component export only.

## Implementation Plan

1. Create component file with `'use client'` and all necessary imports.
2. Copy `ScenarioActionCenterProps` and `ScenarioActionCenter` verbatim.
3. Import `formatScenarioAction`, `scenarioActionClass`, `readScenarioPlan` from helpers.
4. Remove nested definitions from `page.tsx`, add component import.
5. Verify hot-reload compiles.

## Tests

- Hot-reload compilation with zero errors.
- Manual: scenario planner renders identically.

## Acceptance Criteria

- [ ] `ScenarioActionCenter` renders identically from external file.
- [ ] Hot-reload compiles without errors.
- [ ] Props interface unchanged.

## Rollback Plan

- Delete component file, restore nested function in `page.tsx`.
