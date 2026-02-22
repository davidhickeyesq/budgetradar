---
id: P003
title: Ads-ops readiness
state: DONE
execution_status: Done
owner: codex
branch: codex/p003-ads-ops-readiness
pr: https://github.com/davidhickeyesq/budgetradar/pull/22
depends_on:
  - P002
updated_at: 2026-02-20
issue: https://github.com/davidhickeyesq/budgetradar/issues/15
project_item: PVTI_lAHOACofT84BPcnczgloLLk
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P003-ads-ops-readiness.md
---

# P003: Ads-Ops Readiness Foundation

## Goal

Move from local demo posture toward operational readiness via test/CI baseline,
optional auth gate, and initial Google Ads sync interface.

## In Scope

- Ensure meaningful test execution via local command and CI.
- Add optional API-key guardrail for protected endpoints.
- Add Google Ads sync endpoint/service abstraction (MVP ingestion path).

## Out of Scope

- Full production-grade OAuth lifecycle management.
- Advanced campaign hierarchy optimization.
- Multi-tenant RBAC model.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/Makefile
- /Users/davidhickey/Documents/Projects/budgetradar/backend/requirements.txt
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/config.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/main.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/import_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/google_ads.py (new)
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/google_ads_client.py (new)
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/README.md
- /Users/davidhickey/Documents/Projects/budgetradar/.github/workflows/ci.yml (new)

## Public API / Interface Changes

- Optional API key auth:
  - `REQUIRE_API_KEY`
  - `APP_API_KEY`
  - header: `X-API-Key`
- Add `POST /api/import/google-ads/sync`
  - Request: `{ account_id, customer_id, date_from, date_to }`
  - Response: `{ success, rows_imported, channels, date_range }`

## Implementation Plan

1. Align `make test` and backend tests with executable baseline.
2. Add CI workflow for test execution on PRs.
3. Implement optional auth check with safe local defaults.
4. Add Google Ads sync abstraction and endpoint with mocked-client tests.
5. Update docs for credentials, local usage, and security notes.

## Edge Cases / Failure Modes

- Missing/invalid API key in protected mode.
- Date range too large for sync request.
- Partial sync failure across channels.
- Upsert conflicts and duplicate daily rows.

## Tests

- CI:
  - backend test job runs and fails correctly on regressions.
- Auth:
  - no key returns 401 in protected mode.
  - valid key passes.
- Sync:
  - mapping/upsert correctness with mocked provider.
  - validation errors for bad customer/date inputs.

## Acceptance Criteria

- [ ] `make test` runs a meaningful suite.
- [ ] CI enforces backend test gate on PRs.
- [ ] Optional API-key auth works as designed.
- [ ] Google Ads sync endpoint ingests data into `daily_metrics`.
- [ ] Documentation covers setup and caveats.

## Rollback Plan

- Disable auth via env flag.
- Remove/feature-flag sync endpoint.
- Revert CI workflow if it blocks unrelated delivery.
