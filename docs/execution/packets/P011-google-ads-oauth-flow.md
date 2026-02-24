---
id: P011
title: Google Ads OAuth connect flow
state: TODO
execution_status: Backlog
owner:
branch: codex/p011-google-ads-oauth-flow
pr:
depends_on:
  - P007
updated_at: 2026-02-23
issue: https://github.com/davidhickeyesq/budgetradar/issues/37
project_item: PVTI_lAHOACofT84BPcnczgl_pM8
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P011-google-ads-oauth-flow.md
---

# P011: Google Ads OAuth Connect Flow

## Goal

Enable marketer-native account connection from UI, removing manual backend
credential setup for routine Google Ads sync workflows.

## In Scope

- Add OAuth connect/disconnect UX for Google Ads in frontend import workflow.
- Add backend OAuth endpoints and secure token lifecycle handling.
- Persist connected integration credentials per account context.
- Use connected tokens for sync execution in real provider mode.

## Out of Scope

- Multi-platform OAuth (Meta/TikTok/etc.).
- Full enterprise IAM policy engine.
- Scheduled sync automation.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/config.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/db_models.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/google_ads.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/google_ads_provider_real.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/migrations/*
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/import/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts

## Public API / Interface Changes

- New endpoints (shape may vary by implementation):
  - `POST /api/import/google-ads/oauth/start`
  - `GET /api/import/google-ads/oauth/callback`
  - `GET /api/import/google-ads/oauth/status`
  - `POST /api/import/google-ads/oauth/disconnect`
- Sync endpoint behavior:
  - uses stored OAuth connection when available.

## Implementation Plan

1. Define integration token persistence model and encryption strategy.
2. Implement OAuth start/callback/status/disconnect endpoints.
3. Add import-page connect UX with connection status and error states.
4. Wire real provider to token storage for sync requests.
5. Add security and revocation tests.

## Edge Cases / Failure Modes

- Token refresh failure mid-sync.
- User disconnect during active operation.
- Callback replay/state-mismatch attempts.

## Tests

- Backend:
  - OAuth state verification and callback validation.
  - token refresh path and disconnect behavior.
  - sync path with/without connection state.
- Frontend:
  - connect/disconnect states and error rendering.

## Acceptance Criteria

- [ ] User can connect Google Ads from UI without editing backend env credentials.
- [ ] Connected state is visible and revocable in UI.
- [ ] Real-mode sync uses stored OAuth credentials successfully.

## Rollback Plan

- Disable OAuth routes and revert to env-configured credentials only.
- Preserve token tables for future migration compatibility.
