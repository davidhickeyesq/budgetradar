---
id: P018
title: Collapsible scenario planner + layout reorder
state: REVIEW
execution_status: In Review
owner: claude-code
branch: codex/p018-collapsible-scenario-planner-layout
pr:
depends_on:
  - P017
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P018-collapsible-scenario-planner-layout.md
---

# P018: Collapsible Scenario Planner + Layout Reorder

## Goal

Fix dashboard information hierarchy by promoting channel insights above the fold
and moving scenario controls into a collapsible section.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P2)

## In Scope

- Reorder main dashboard composition: target input, action banner, channel grid,
  then planner.
- Add collapsible wrapper for planner with chevron state.
- Remove duplicated planner header content from internal component body.
- Auto-collapse planner after successful auto-generated scenario.
- Optional extraction of `ScenarioActionCenter` into dedicated component file.

## Out of Scope

- Scenario generation business logic.
- New optimization inputs beyond existing controls.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/ScenarioActionCenter.tsx (optional new file)

## Public API / Interface Changes

- No backend/API changes.
- Dashboard interaction model becomes collapsible for planner area.

## Implementation Plan

1. Add `scenarioExpanded` state in page component.
2. Reorder top-level JSX to prioritize channel analysis area.
3. Wrap `ScenarioActionCenter` in card header toggle shell.
4. Remove redundant internal planner title block.
5. Collapse planner after auto-generation success.
6. Extract planner component if needed to reduce file size/complexity.

## Edge Cases / Failure Modes

- Toggle state desync during async scenario generation.
- Collapsed planner hides validation errors unexpectedly.
- Layout reorder regressions in small viewports.

## Tests

- Frontend:
  - planner expands/collapses reliably.
  - channel analysis renders above planner by default.
  - auto-generation collapses planner on success.
- Manual:
  - verify planner controls still function when re-opened.

## Acceptance Criteria

- [ ] Channel cards are visible earlier in page flow.
- [ ] Planner can be collapsed and expanded reliably.
- [ ] Auto-generated baseline collapses planner once available.

## Rollback Plan

- Restore previous static planner-first layout and remove collapsible wrapper.
