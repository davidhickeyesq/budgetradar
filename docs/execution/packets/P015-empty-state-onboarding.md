---
id: P015
title: Empty-state onboarding for no-data accounts
state: IN_PROGRESS
execution_status: In Progress
owner: claude-code
branch: codex/p015-empty-state-onboarding
pr:
depends_on:
  - P014
updated_at: 2026-02-24
issue:
project_item:
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P015-empty-state-onboarding.md
---

# P015: Empty-State Onboarding for No-Data Accounts

## Goal

Replace backend/no-data error messaging with a first-run onboarding screen when
an account has no `daily_metrics` rows.

## Source Spec

- /Users/davidhickey/Documents/Projects/budgetradar/.claude/worktrees/festive-chatelet/UX_IMPROVEMENT_PLAN.md (P3)

## In Scope

- Detect no-data response patterns in dashboard fetch flow.
- Treat no-data responses as empty state, not failure state.
- Add welcome/onboarding card with import CTA.
- Route users to `/import` from the onboarding action.

## Out of Scope

- Changes to CSV import processing.
- Changes to backend no-data response format.
- New onboarding flow steps beyond dashboard empty state.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx

## Public API / Interface Changes

- No API contract changes.
- Frontend interprets select no-data error strings as empty state.

## Implementation Plan

1. Update analysis fetch error handler to classify known no-data responses.
2. Clear error state and keep `channels` empty for no-data path.
3. Add empty-state guard and render welcome card before main dashboard layout.
4. Provide import CTA and helper copy for first-time users.

## Edge Cases / Failure Modes

- Legitimate backend failures incorrectly classified as no-data.
- Empty-state guard conflicting with loading/error precedence.

## Tests

- Frontend:
  - no-data response renders welcome card.
  - non-no-data error still renders error card.
- Manual:
  - verify CTA navigation to `/import`.

## Acceptance Criteria

- [ ] Empty accounts show onboarding card, not red error block.
- [ ] Existing error handling remains intact for real failures.
- [ ] Import CTA is visible and functional.

## Rollback Plan

- Remove no-data classification branch and restore existing error path.
