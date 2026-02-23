# Shared Multi-Agent Execution System (GitHub Projects v2)

## Objective

Establish a repeatable execution system across Codex and Google Anti-Gravity
using:

- Repo packet docs as canonical implementation spec.
- GitHub Projects v2 as operational visibility board.
- Parent Epic issue with packet sub-issues.

## Operating Model

- Project type: GitHub Projects v2.
- Scope: foundation only (no automations in this phase).
- Execution: one packet PR at a time.
- Hierarchy: one Epic issue + packet issues as sub-issues.

## Packet Order

1. `P001` Account context + import UX consistency
2. `P002` Alpha-aware marginal CPA + chart parity
3. `P003` Ads-ops readiness foundation
4. `P004` Account context completion
5. `P005` Scenario recommendations
6. `P006` Data quality and confidence guardrails
7. `P007` Ads integration and CI hardening
8. `P008` Per-entity target CPA contracts and UI
9. `P009` Confidence policy and gating semantics
10. `P010` Scenario step constraint UX clarity
11. `P011` Google Ads OAuth connect flow
12. `P012` Campaign-level granularity
13. `P013` Scenario deploy-to-platform

Dependency chain:

- `P002` depends on `P001`
- `P003` depends on `P002`
- `P005` depends on `P004`
- `P006` depends on `P005`
- `P007` depends on `P006`
- `P009` depends on `P006`
- `P008` depends on `P009`
- `P010` depends on `P005`
- `P011` depends on `P007`
- `P012` depends on `P011`
- `P013` depends on `P011`, `P012`, and `P005`

## Branch / PR Naming

- Branch pattern: `codex/p00x-short-name`
- PR title pattern: `[P00X] short title`

## Enforcement Layer

The following controls are now committed in-repo:

1. Handoff protocol:
   `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/HANDOFF_PROTOCOL.md`
2. PR template contract:
   `/Users/davidhickey/Documents/Projects/budgetradar/.github/PULL_REQUEST_TEMPLATE.md`
3. CI check for packet PR metadata and title:
   `/Users/davidhickey/Documents/Projects/budgetradar/.github/workflows/packet-pr-guardrails.yml`

## Day-by-Day Rollout

### Day 1

1. Create Project v2 named `BudgetRadar Execution`.
2. Create custom fields and required views.
3. Create Epic issue and packet issues.
4. Add all issues to project and set initial states.

### Day 2

1. Finalize packet docs in `docs/execution/packets/`.
2. Insert issue/PR/project links into packet docs.
3. Sync project field values from packet docs.

### Day 3+

1. Work one packet at a time.
2. Move packet state via PR lifecycle:
   - PR open: `In Review`
   - PR merge: `Done`
3. Promote next packet from `Backlog` to `Ready`.
4. Use CI guardrail failures as hard stop until PR metadata contract is fixed.

## Governance Rules

1. Packet docs are canonical.
2. Project fields mirror execution status/ownership only.
3. Scope changes require packet doc update before project update.
4. No packet starts without:
   - `Status=Ready`
   - explicit owner
   - dependencies cleared

## Project v2 Field Schema

- `Type` (single select): `Epic`, `Packet`, `Chore`
- `Execution Status` (single select): `Backlog`, `Ready`, `In Progress`,
  `Blocked`, `In Review`, `Done`
- `Packet ID` (text): `P001` through `P013`
- `Spec Path` (text): absolute path to packet markdown
- `Branch` (text)
- `PR URL` (text)
- `Depends On` (text)
- `Start Date` (date)
- `Target Date` (date)

## Required Views

1. `Board - Packets by Status` (filter `Type=Packet`, group by
   `Execution Status`)
2. `Table - All Execution Items` (all fields visible)
3. `Roadmap - Packet Schedule` (date-based)

### Note

The public GitHub GraphQL/CLI surface does not currently expose mutations for
project view creation. Views must be created/configured manually in the project
web UI.

## Validation Checklist

- Epic shows all packet sub-issues.
- Project filter `Type=Packet` returns exactly thirteen packet items.
- Exactly one packet is `In Progress` at any time.
- Packet issue, PR, and packet doc all cross-link to each other.
