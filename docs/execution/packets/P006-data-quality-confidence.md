---
id: P006
title: Input, docs, and runtime hardening bundle
state: DONE
execution_status: Done
owner: codex
branch: codex/p006-hardening-bundle
pr: https://github.com/davidhickeyesq/budgetradar/pull/29
depends_on:
  - P005
updated_at: 2026-02-22
issue: https://github.com/davidhickeyesq/budgetradar/issues/25
project_item: PVTI_lAHOACofT84BPcnczgl7EVI
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P006-data-quality-confidence.md
---

# P006: Input, Docs, and Runtime Hardening Bundle

## Goal

Bundle three release-readiness fixes into one execution packet:

1. strict CSV validation and tests for malformed/negative values
2. documentation alignment to current truth
3. frontend runtime hardening for API-key mode and local font build reliability

## In Scope

- Add failing tests first for CSV invalid numeric, negative numeric, and invalid date input.
- Update CSV import to reject invalid required fields with 400 responses and actionable error detail.
- Ensure malformed dates return 4xx import errors (not 500).
- Align docs with implemented behavior:
  - 10% marginal increment rule
  - local-first current deployment posture
  - actual frontend UI stack usage
- Add optional frontend `X-API-Key` header support for protected `/api/*` mode.
- Replace remote Google font dependency with local font strategy to keep frontend builds reliable in restricted/offline environments.

## Out of Scope

- New model-confidence scoring framework and UI diagnostics.
- Real Google Ads provider implementation.
- Supabase cloud runtime implementation.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/import_data.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/main.py (if import error handling/middleware touch required)
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/CsvUploader.tsx (if surfacing import validation feedback)
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/layout.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/globals.css
- /Users/davidhickey/Documents/Projects/budgetradar/README.md
- /Users/davidhickey/Documents/Projects/budgetradar/AGENTS.md
- /Users/davidhickey/Documents/Projects/budgetradar/docs/project-context.md
- /Users/davidhickey/Documents/Projects/budgetradar/docs/CSV_FORMAT.md
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/README.md

## Public API / Interface Changes

- `POST /api/import/csv`
  - invalid date/numeric/negative required values return 400 with actionable detail
  - no silent coercion of invalid required fields to zero
- Frontend API client optionally sends `X-API-Key` header when configured

## Implementation Plan

1. Add/adjust backend tests that fail on current permissive CSV behavior.
2. Implement strict CSV validation and 400 response mapping in import route.
3. Update docs to match implementation truth for math rule + deployment/runtime posture.
4. Add API key header propagation in frontend fetch layer.
5. Swap remote font dependency for local font setup and confirm frontend build stability.

## Edge Cases / Failure Modes

- CSV with mixed valid and invalid rows.
- Import payloads with currency symbols, blanks, or malformed dates.
- Protected API mode enabled without frontend API key configured.
- Font fallback regressions after local font migration.

## Tests

- Backend:
  - invalid numeric/date required values return 400.
  - negative `spend`/`conversions` return 400.
  - malformed date returns 400 (not 500).
- Frontend:
  - API client includes `X-API-Key` when configured.
  - production build passes after local font migration.

## Acceptance Criteria

- [ ] CSV import no longer silently converts invalid required fields to zero.
- [ ] Invalid date/numeric/negative required values return 400 with actionable detail.
- [ ] Documentation reflects implemented 10% increment and current deployment/runtime truth.
- [ ] Frontend works with optional API-key protected backend mode.
- [ ] Frontend build no longer depends on remote Google font fetch.

## Rollback Plan

- Revert strict import validation to previous behavior if ingestion compatibility blocks release.
- Disable frontend API-key header injection behind config flag.
- Restore prior font setup if unexpected visual regressions occur.
