---
id: P001
title: Account context + import UX
state: TODO
execution_status: Ready
owner:
branch: codex/p001-account-context
pr:
depends_on: []
updated_at: 2026-02-17
issue: https://github.com/davidhickeyesq/budgetradar/issues/17
project_item: PVTI_lAHOACofT84BPcnczgloLM4
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P001-account-context.md
---

# P001: Account Context + Import UX

## Goal

Eliminate account-context mismatch between dashboard and import flows and make
local-first import work without manual account provisioning.

## In Scope

- Remove hardcoded account IDs from dashboard/import pages.
- Add backend endpoint to retrieve deterministic default account.
- Ensure import path handles unknown valid account IDs in local-first mode.
- Align seed and default-account behavior.

## Out of Scope

- Authentication and multi-user account management.
- Cloud tenancy design.
- Ads platform integration.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/import/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/import_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/database.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/scripts/seed_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/README.md

## Public API / Interface Changes

- Add `GET /api/accounts/default`
  - Response: `{ "account_id": "<uuid>", "name": "<string>" }`
- Adjust import behavior:
  - Invalid UUID: `400`
  - Unknown valid UUID in local mode: create account then import

## Implementation Plan

1. Add default-account read/create service helper.
2. Add `GET /api/accounts/default` router endpoint.
3. Update import route behavior for unknown valid account IDs.
4. Replace hardcoded frontend account IDs with API-fetched account context.
5. Keep deterministic seed account behavior aligned with default endpoint.
6. Update docs and example flows.

## Edge Cases / Failure Modes

- Default endpoint called before seed has run.
- Concurrent imports trying to create same account.
- Missing/invalid API base URL in frontend environment.

## Tests

- Backend unit/integration:
  - default account endpoint returns deterministic account.
  - unknown valid account import auto-creates.
  - invalid UUID returns `400`.
- Manual:
  - start clean stack, load dashboard and import page with no manual account edits.

## Acceptance Criteria

- [ ] No hardcoded account IDs remain in dashboard/import page code.
- [ ] Dashboard and import use the same active account.
- [ ] Import succeeds for unknown valid account IDs (local mode).
- [ ] API docs include default account endpoint.

## Rollback Plan

- Revert endpoint and restore strict account-not-found import behavior.
- Restore previous frontend constants.
