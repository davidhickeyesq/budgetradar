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

Dependency chain:

- `P002` depends on `P001`
- `P003` depends on `P002`

## Branch / PR Naming

- Branch pattern: `codex/p00x-short-name`
- PR title pattern: `[P00X] short title`

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
- `Packet ID` (text): `P001`, `P002`, `P003`
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
- Project filter `Type=Packet` returns exactly three packet items.
- Exactly one packet is `In Progress` at any time.
- Packet issue, PR, and packet doc all cross-link to each other.
