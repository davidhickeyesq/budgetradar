---
id: P006
title: Data quality and confidence guardrails
state: TODO
execution_status: Backlog
owner:
branch: codex/p006-data-quality-confidence
pr:
depends_on:
  - P005
updated_at: 2026-02-22
issue: https://github.com/davidhickeyesq/budgetradar/issues/25
project_item: PVTI_lAHOACofT84BPcnczgl7EVI
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P006-data-quality-confidence.md
---

# P006: Data Quality and Confidence Guardrails

## Goal

Increase trust in outputs by preventing silent bad-input coercion and exposing
fit/data-quality confidence diagnostics in API + UI.

## In Scope

- Tighten CSV validation for required fields and row-level parse failures.
- Return structured import validation feedback instead of silent zero-filling.
- Add channel analysis diagnostics for data sufficiency and model confidence.
- Surface confidence warnings in dashboard UI.
- Reconcile documentation/math references to a single 10% marginal increment rule.

## Out of Scope

- Third-party data observability platform integration.
- Statistical model-family replacement beyond Hill + adstock.
- Account-level anomaly detection automation.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/import_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/hill_function.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/import/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CsvUploader.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/types/index.ts
- /Users/davidhickey/Documents/Projects/budgetradar/README.md
- /Users/davidhickey/Documents/Projects/budgetradar/docs/project-context.md
- /Users/davidhickey/Documents/Projects/budgetradar/docs/CSV_FORMAT.md

## Public API / Interface Changes

- Import response shape extended with validation metadata:
  - `warnings[]`
  - `rejected_rows[]` with row number and reason
- Analysis channel payload extended with diagnostics:
  - `data_days`
  - `non_zero_days`
  - `confidence_level` (`high|medium|low`)
  - `confidence_warnings[]`

## Implementation Plan

1. Define import/analysis diagnostic schema additions.
2. Replace silent coercion with explicit row validation and rejection reporting.
3. Add analysis confidence computation from data sufficiency + fit quality.
4. Render warnings/diagnostics in import and dashboard views.
5. Update docs to remove 1% increment references and align with AGENTS.md.

## Edge Cases / Failure Modes

- CSV with mixed valid and invalid rows.
- Extremely sparse channels that cannot produce stable fit metrics.
- Legacy clients expecting old import response shape.
- Large rejection lists impacting response payload size.

## Tests

- Backend:
  - invalid numeric/date rows are rejected with explicit reasons.
  - analysis returns confidence metadata for success and grey cases.
  - docs/contracts remain backward compatible where required.
- Frontend:
  - import UI renders rejected-row/warning feedback.
  - channel cards show confidence warnings without breaking layout.
- Manual:
  - upload intentionally malformed CSV and verify actionable feedback.

## Acceptance Criteria

- [ ] CSV import no longer silently converts invalid required metrics to zero.
- [ ] API returns row-level validation feedback for bad imports.
- [ ] Analysis output includes confidence diagnostics per channel.
- [ ] UI clearly communicates low-confidence recommendations.
- [ ] Documentation consistently states 10% marginal increment.

## Rollback Plan

- Revert to previous permissive CSV parsing behavior.
- Remove confidence fields from API/UI while keeping core analysis response.
- Restore prior docs wording if client contract risks emerge.
