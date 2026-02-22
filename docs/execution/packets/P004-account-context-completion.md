---
id: P004
title: Account context completion
state: IN_PROGRESS
execution_status: In Progress
owner: codex
branch: codex/p004-account-context-completion
pr:
depends_on: []
updated_at: 2026-02-22
issue: https://github.com/davidhickeyesq/budgetradar/issues/23
project_item: PVTI_lAHOACofT84BPcnczgl7EUY
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P004-account-context-completion.md
---

# P004: Account Context Completion

## Goal

Close the remaining account-context gaps so dashboard, import, and sync flows
always operate on the same account without hardcoded IDs.

## In Scope

- Add backend default account resolver endpoint.
- Remove hardcoded account IDs from frontend dashboard/import pages.
- Use a shared frontend account-context loader for all account-bound requests.
- Update import/sync account handling for local-first unknown valid UUID flows.
- Ensure seed/default account behavior is deterministic and consistent.

## Out of Scope

- Multi-user account switching UX.
- Authentication and tenancy model changes.
- Cloud account provisioning workflow.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/import/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CsvUploader.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/import_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/google_ads.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/database.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/scripts/seed_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/README.md

## Public API / Interface Changes

- Add `GET /api/accounts/default`
  - Response: `{ "account_id": "<uuid>", "name": "<string>" }`
- Import and sync account handling:
  - invalid UUID: `400`
  - unknown valid UUID in local mode: create account, then ingest

## Implementation Plan

1. Add database service helper to get/create deterministic default account.
2. Add `GET /api/accounts/default` route and schema.
3. Update import and Google Ads sync to support local unknown-valid account IDs.
4. Replace frontend hardcoded IDs with API-derived account context.
5. Show active account context in dashboard/import views.
6. Update docs and tests for default-account contract.

## Edge Cases / Failure Modes

- Default account requested before seed runs.
- Concurrent first-load requests creating default account.
- Unknown valid UUID collision on generated account name.
- Missing API URL or temporary API failure during account-context fetch.

## Tests

- Backend:
  - default endpoint returns deterministic account.
  - invalid UUID returns `400`.
  - unknown valid UUID import/sync succeeds in local mode.
- Frontend:
  - dashboard/import resolve same account context.
  - no hardcoded account IDs remain in account-bound pages.
- Manual:
  - clean stack startup + import + dashboard flow with no manual account edits.

## Acceptance Criteria

- [ ] Dashboard and import use a shared API-fetched account context.
- [ ] No hardcoded account IDs remain in account-bound frontend pages.
- [ ] `GET /api/accounts/default` is available and documented.
- [ ] Local unknown-valid UUID import/sync path succeeds.
- [ ] Account mismatch between dashboard and import cannot be reproduced.

## Rollback Plan

- Revert to strict account existence checks on import/sync.
- Revert frontend to previous account-ID path.
- Remove default-account endpoint.
