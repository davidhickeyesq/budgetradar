---
id: P012
title: Campaign-level granularity
state: TODO
execution_status: Backlog
owner:
branch: codex/p012-campaign-granularity
pr:
depends_on:
  - P011
updated_at: 2026-02-23
issue: https://github.com/davidhickeyesq/budgetradar/issues/35
project_item: PVTI_lAHOACofT84BPcnczgl_pNA
epic_issue: https://github.com/davidhickeyesq/budgetradar/issues/14
spec_path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P012-campaign-granularity.md
---

# P012: Campaign-Level Granularity

## Goal

Upgrade ingestion and analysis entities from broad channel archetypes to
campaign-level rows so recommendations match real budget levers.

## In Scope

- Extend Google Ads ingestion to include campaign identifiers and names.
- Update storage and query paths to support campaign-level metrics.
- Expose campaign-level entities in analysis/scenario payloads and UI.
- Preserve optional channel-level rollup view for high-level summary.

## Out of Scope

- Portfolio bidding strategy optimization logic.
- Cross-platform campaign normalization.
- Deploy-to-platform write-back actions.

## Files Expected to Change

- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/db_models.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/models/schemas.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/database.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/services/google_ads_provider_real.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/analysis.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/app/routers/scenarios.py
- /Users/davidhickey/Documents/Projects/budgetradar/backend/migrations/*
- /Users/davidhickey/Documents/Projects/budgetradar/backend/tests/*
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/types/index.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/lib/api.ts
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/app/page.tsx
- /Users/davidhickey/Documents/Projects/budgetradar/frontend/src/components/TrafficLightRadar.tsx

## Public API / Interface Changes

- Entity metadata additions:
  - `entity_type` (`channel` | `campaign`)
  - `entity_id`
  - `entity_name`
  - optional rollup labels (`channel_name`, `portfolio_name`)
- CSV/import schema additions (optional):
  - `campaign_id`, `campaign_name`

## Implementation Plan

1. Design additive schema migration for campaign metadata.
2. Update ingestion providers and upsert logic to persist campaign fields.
3. Extend analysis/scenario query paths for campaign-level entity selection.
4. Add UI rendering for campaign entities with optional channel rollup.
5. Validate performance and payload size impacts.

## Edge Cases / Failure Modes

- Missing campaign name but present campaign ID.
- Campaign renames over time causing duplicate display labels.
- Increased row cardinality causing slow analysis responses.

## Tests

- Backend:
  - campaign fields persist and round-trip through analysis.
  - rollup mode still returns channel-level summary correctly.
- Frontend:
  - campaign rows render independently with distinct curves/actions.
  - channel rollup view remains functional.

## Acceptance Criteria

- [ ] At least two campaigns under one network render as separate entities.
- [ ] Scenario recommendations target campaign entities, not only channel archetypes.
- [ ] Channel rollup remains available and coherent.

## Rollback Plan

- Disable campaign-level mode and fall back to channel-only aggregation.
- Keep additive schema columns nullable to avoid data-loss migration rollback.
