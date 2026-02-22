---
id: P007
title: Ads integration and CI hardening
state: REVIEW
execution_status: In Review
owner: codex
branch: codex/p007-ads-integration-ci-hardening
pr: https://github.com/davidhickeyesq/budgetradar/pull/30
depends_on:
  - P006
updated_at: 2026-02-22
issue: https://github.com/davidhickeyesq/budgetradar/issues/26
project_item: PVTI_lAHOACofT84BPcnczgl7EVU
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P007-ads-integration-ci-hardening.md
---

# P007: Ads Integration and CI Hardening

## Goal

Move ads ingestion from mock-only posture to production-capable provider
plumbing and expand CI gates beyond backend tests.

## In Scope

- Keep deterministic local provider for demo mode.
- Add production Google Ads provider implementation behind configuration flag.
- Add provider selection/credential validation path in backend config/service.
- Expand CI with frontend lint/typecheck/build jobs plus backend tests.
- Add docs/runbook for local mock mode vs real provider mode.

## Out of Scope

- Fully automated OAuth consent screen lifecycle management.
- Multi-platform ingestion (Meta, TikTok, etc.).
- Automated deployment workflows.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/config.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/google_ads.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/google_ads_client.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/google_ads_provider_real.py (new)
- /Users/davidhickey/Documents/Projects/budgetradar/backend/requirements.txt
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/.github/workflows/ci.yml
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/package.json
- /Users/davidhickey/Documents/Projects/budgetradar/README.md
- /Users/davidhickey/Documents/Projects/budgetradar/docs/MIGRATION.md

## Public API / Interface Changes

- `POST /api/import/google-ads/sync` response extended with:
  - `provider_mode` (`mock|real`)
- New config contract:
  - `GOOGLE_ADS_PROVIDER=mock|real`
  - real-mode credentials required when provider is `real`

## Implementation Plan

1. Introduce provider interface and runtime selection wiring.
2. Implement real provider adapter with credential validation.
3. Preserve deterministic mock provider behavior as local default.
4. Add CI jobs for frontend lint/typecheck/build and keep backend test job.
5. Update docs for secure real-mode setup and troubleshooting.

## Edge Cases / Failure Modes

- Real provider selected with missing/invalid credentials.
- API quota/rate limit failures during sync window.
- Partial fetch failures across date ranges.
- CI runtime inflation causing slow feedback loops.

## Tests

- Backend:
  - provider selection honors configuration.
  - real provider path fails fast with clear credential errors.
  - mock provider behavior unchanged in local mode.
- CI:
  - frontend jobs fail on lint/type errors.
  - backend tests remain required.
- Manual:
  - verify mock mode unchanged and real mode handshake validates credentials.

## Acceptance Criteria

- [ ] Google Ads sync supports both `mock` and `real` provider modes.
- [ ] Real-mode misconfiguration returns actionable errors.
- [ ] CI includes frontend quality gates in addition to backend tests.
- [ ] Local-first default remains zero-credential mock mode.
- [ ] Docs clearly describe mode selection and setup.

## Rollback Plan

- Force provider mode to mock-only.
- Remove new frontend CI jobs if they block delivery.
- Keep existing sync endpoint contract and mock flow intact.
