---
id: P020
title: Save-scenario confirmation feedback
state: REVIEW
execution_status: In Review
owner: claude-code
branch: codex/p020-scenario-save-feedback
pr: https://github.com/davidhickeyesq/budgetradar/pull/48
depends_on:
  - P019
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P020-scenario-save-feedback.md
---

# P020: Save-Scenario Confirmation Feedback

## Goal

Provide clear transient visual feedback after saving a scenario so users can
confirm success without inferring from dropdown state.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P7)

## In Scope

- Add `saveConfirmation` state in dashboard scenario flow.
- Set success message after scenario save/load refresh.
- Auto-dismiss confirmation after short timeout.
- Render confirmation near save controls in planner UI.

## Out of Scope

- Toast/modal framework introduction.
- Backend scenario-save endpoint behavior changes.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/ScenarioActionCenter.tsx (or inline component region in page.tsx)

## Public API / Interface Changes

- No API changes.
- UI-only confirmation messaging.

## Implementation Plan

1. Add transient save-confirmation state in page component.
2. Populate message after successful save + scenario list refresh.
3. Clear message after 3 seconds.
4. Pass message to planner component and render inline success text.

## Edge Cases / Failure Modes

- Timeout race with rapid repeated saves.
- Success text appears on failed save path.

## Tests

- Frontend:
  - success message appears on successful save.
  - message clears automatically.
- Manual:
  - save scenario and verify dropdown selection still updates correctly.

## Acceptance Criteria

- [ ] Save action shows explicit success confirmation.
- [ ] Confirmation auto-dismisses without manual action.
- [ ] Existing save flow remains unchanged otherwise.

## Rollback Plan

- Remove confirmation state and inline message rendering.
