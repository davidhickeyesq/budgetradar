---
id: P026
title: Create /plan page with all planner functionality
state: TODO
execution_status: Backlog
owner: ""
branch: codex/p026-plan-page
pr: ""
depends_on:
  - P024
  - P025
updated_at: 2026-02-26
issue: ""
project_item: ""
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P026-plan-page.md
---

# P026: Create /plan Page with All Planner Functionality

## Goal

Create a new `/plan` route that owns all scenario planner state, auto-generation,
save/load, and export functionality.

## In Scope

- Create `frontend/src/app/plan/page.tsx` (~600 lines).
- Page owns planner-only state: `budgetDeltaPercent`, `lockedChannels`, `scenarioPlan`,
  `scenarioLoading`, `scenarioSaving`, `saveConfirmation`, `scenarioError`,
  `scenarioName`, `savedScenarios`, `selectedScenarioId`.
- Re-fetch `channels` via `analyzeChannels()` on mount.
- Read `targetCpa` from localStorage key `budgetradar_target_cpa`.
- Read channel target overrides from localStorage key `budgetradar_channel_target_overrides`.
- Move auto-generation `useEffect` from page.tsx (L508-524).
- Move all scenario handlers: generate, save, load, select, export CSV/JSON.
- Render: "← Back to Channel Review" link, page title, target CPA input,
  "What To Do Now" banner, `ScenarioActionCenter` component.
- Write channel target overrides to localStorage after applying.

## Out of Scope

- Does not modify `page.tsx` (that's P027).
- No NavBar or StepIndicator changes (P028/P029).

## Files Expected to Change

- `frontend/src/app/plan/page.tsx` (NEW)

## Public API / Interface Changes

- New frontend route `/plan`. No backend changes.

## Implementation Plan

1. Create `app/plan/page.tsx` with `'use client'`.
2. Import helpers from `@/lib/scenario-helpers` and `ScenarioActionCenter` from component.
3. Implement channel fetch + target CPA localStorage read on mount.
4. Implement all scenario handlers (copied from page.tsx).
5. Implement auto-generation useEffect with useRef guard.
6. Render complete planner UI.
7. Verify `/plan` compiles and works end-to-end.

## Tests

- Hot-reload compilation on `/plan` with zero errors.
- Manual: generate, save, load, export scenarios all work.
- Target CPA from localStorage is respected.

## Acceptance Criteria

- [ ] `/plan` route compiles and renders the full planner.
- [ ] Auto-generates scenario on mount when channels are available.
- [ ] Generate, save, load, export all work on `/plan`.
- [ ] Target CPA reads from localStorage.
- [ ] Channel target overrides persist to localStorage after applying.

## Rollback Plan

- Delete `app/plan/` directory.
