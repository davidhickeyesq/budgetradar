---
id: P008
title: Workflow activation (planner-first + ads sync launcher + CSV mapping)
state: IN_PROGRESS
execution_status: In Progress
owner: codex
branch: codex/p008-workflow-activation
pr:
depends_on:
  - P007
updated_at: 2026-02-22
issue: https://github.com/davidhickeyesq/budgetradar/issues/32
project_item: PVTI_lAHOACofT84BPcnczgl72eU
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P008-workflow-activation.md
---

# P008: Workflow Activation

## Goal

Convert BudgetRadar into a daily operator workflow without changing core
Hill-function math, marginal increment, traffic-light thresholds, or cold-start
constraints.

## In Scope

- Planner-first dashboard action center with clear primary CTA.
- Baseline scenario auto-generation and "what to do now" operator summary.
- Scenario overlay points on channel curve visualizations.
- Confidence tiers + soft warnings for low-fit action recommendations.
- Export scenario recommendations (CSV and JSON) for manual deployment.
- Import-page Google Ads sync launcher using existing backend sync route.
- New lightweight capabilities endpoint for Google Ads preflight metadata.
- CSV header mapping UX + backend mapping contract while keeping strict
  validation semantics.
- Frontend typecheck/build parity hardening if required.

## Out of Scope

- OAuth consent/token lifecycle UI.
- One-click campaign mutation / apply-to-platform automation.
- Changes to Hill fitting strategy or traffic-light decision rules.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/status.yaml
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/google_ads.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/import_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/test_google_ads_sync.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/test_import_csv_contract.py
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/import/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CostCurveChart.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CsvUploader.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/types/index.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/package.json
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/tsconfig.json

## Public API / Interface Changes

1. `POST /api/import/csv`
   - New optional multipart field: `column_map` (JSON string).
   - Allowed canonical targets: `date`, `channel_name`, `spend`,
     `conversions`, `impressions`.
   - Mapping validation enforces allowed keys, unique targets, and existing
     source columns.
   - Row validation remains strict and all-or-nothing after remap.

2. `GET /api/import/google-ads/capabilities` (new)
   - Returns `{ provider_mode, max_sync_days }`.

3. Frontend scenario and chart interfaces:
   - projected overlay point support on charts.
   - confidence tier metadata for recommendations.

## Tests

- CSV mapping backend tests:
  - successful mapping import.
  - invalid mapping key.
  - duplicate source/target mapping.
  - mapped source column missing.
  - strict validation unchanged post-map.
- Google Ads capabilities endpoint tests:
  - provider mode reflected.
  - max sync days reflected.
- Scenario regression tests:
  - deterministic 10% stepping behavior remains intact.
- Frontend checks:
  - lint, typecheck, and build pass.

## Acceptance Criteria

- Clear primary planner action is visible on dashboard load.
- Baseline recommendation appears automatically once analysis resolves.
- Scenario recommendations are reflected in chart overlays and summary outputs.
- Confidence warnings are visible and non-blocking.
- Google Ads sync is accessible in UI via launcher form.
- CSV import supports mapped headers while preserving strict validation.
- Exported plan output matches scenario recommendation payload.

## Rollback Plan

- Disable/remove planner-first enhancements and revert dashboard to prior layout.
- Remove `column_map` handling and keep strict canonical CSV import contract.
- Remove capabilities endpoint and Google Ads launcher UI while retaining
  existing sync endpoint.
