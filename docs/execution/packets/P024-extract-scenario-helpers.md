---
id: P024
title: Extract pure helpers into lib/scenario-helpers.ts
state: TODO
execution_status: Ready
owner: ""
branch: codex/p024-extract-scenario-helpers
pr: ""
depends_on: []
updated_at: 2026-02-26
issue: ""
project_item: ""
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P024-extract-scenario-helpers.md
---

# P024: Extract Pure Helpers into lib/scenario-helpers.ts

## Goal

Move all non-React helper functions and constants from `page.tsx` into a shared
`scenario-helpers.ts` module so both `/` and `/plan` pages can import them.

## In Scope

- Create `frontend/src/lib/scenario-helpers.ts`.
- Move these functions from `page.tsx`:
  - `mapApiToChannelMetrics` (L32-62)
  - `formatTargetCpaInput` (L64-66)
  - `buildChannelTargetMap` (L68-73)
  - `buildChannelTargetDrafts` (L75-80)
  - `buildChannelTargetDraftsFromMap` (L82-92)
  - `buildChannelTargetOverrides` (L94-106)
  - `mapScenarioPlan` (L107-141)
  - `applyRecommendationConfidence` (L143-164)
  - `serializeScenarioPlan` (L166-205)
  - `readScenarioPlan` (L207-226)
  - `readScenarioTargetOverrides` (L228-264)
  - `formatMoney` (L266-271)
  - `sanitizeFileName` (L273-276)
  - `downloadFile` (L278-288)
  - `escapeCsv` (L290-300)
  - `buildNextActionSummary` (L302-316)
  - `formatScenarioAction` (L1385-1391)
  - `scenarioActionClass` (L1393-1399)
- Move constants: `DEFAULT_TARGET_CPA`, `DEFAULT_BUDGET_DELTA_PERCENT`, `BUDGET_DELTA_PRESETS`.
- Update `page.tsx` to import from `@/lib/scenario-helpers`.

## Out of Scope

- No behavioral changes. Page renders identically.
- No new routes or components.

## Files Expected to Change

- `frontend/src/lib/scenario-helpers.ts` (NEW)
- `frontend/src/app/page.tsx` (remove local defs, add imports)

## Public API / Interface Changes

- No backend API changes.
- New module export surface only.

## Implementation Plan

1. Create `scenario-helpers.ts` with all functions and constants exported.
2. Add necessary type imports from `@/types` and `@/lib/api`.
3. Replace local definitions in `page.tsx` with imports.
4. Verify hot-reload compiles.

## Tests

- Hot-reload compilation with zero errors.
- Manual: dashboard renders identically.

## Acceptance Criteria

- [ ] All functions exported from `scenario-helpers.ts`.
- [ ] `page.tsx` imports all helpers from new module.
- [ ] Hot-reload compiles without errors.
- [ ] Zero behavioral regression.

## Rollback Plan

- Delete `scenario-helpers.ts`, restore local defs in `page.tsx`.
