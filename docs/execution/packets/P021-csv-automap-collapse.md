---
id: P021
title: CSV auto-map collapse and review toggle
state: REVIEW
execution_status: In Review
owner: claude-code
branch: codex/p021-csv-automap-collapse
pr: https://github.com/davidhickeyesq/budgetradar/pull/49
depends_on:
  - P020
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P021-csv-automap-collapse.md
---

# P021: CSV Auto-Map Collapse and Review Toggle

## Goal

Reduce CSV import visual noise by collapsing the full mapping grid when required
fields are auto-detected successfully, while preserving manual review/editing.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P8)

## In Scope

- Add `mappingExpanded` UI state.
- Add helper for required-field mapping completeness.
- Auto-expand when required mappings are missing.
- Render success summary + review toggle when mappings are complete.

## Out of Scope

- CSV parsing contract changes.
- Backend import mapping validation changes.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CsvUploader.tsx

## Public API / Interface Changes

- No API changes.
- Import mapping UI behavior becomes conditional/collapsible.

## Implementation Plan

1. Add mapping-expanded state and required-map helper.
2. Set expansion state after suggested-map generation based on completeness.
3. Replace always-visible grid with conditional complete/incomplete states.
4. Keep existing mapping controls available under "Review mapping" toggle.

## Edge Cases / Failure Modes

- Partial maps incorrectly treated as complete.
- Toggle state not reset when uploading a new file.

## Tests

- Frontend:
  - standard-header CSV collapses mapping section by default.
  - non-standard CSV expands mapping section with warning.
- Manual:
  - review toggle expands/collapses mapping grid correctly.

## Acceptance Criteria

- [ ] Fully mapped uploads show compact success state.
- [ ] Users can still inspect/edit mappings on demand.
- [ ] Incomplete mappings remain prominent and actionable.

## Rollback Plan

- Restore always-expanded mapping grid.
