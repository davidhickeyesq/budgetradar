# Shared Multi-Agent Execution System (Repo-First)

## Objective

Establish a repeatable execution system across Codex and Google Anti-Gravity
using:

- Repo packet docs as canonical implementation spec.
- `status.yaml` as the machine-readable execution index.
- Optional external mirrors (GitHub issues/projects) only when useful.

## Operating Model

- Tracking model: repo-first.
- Scope: foundation only (no automations in this phase).
- Execution: one packet PR at a time.
- Hierarchy: packet docs + `status.yaml` (no required issue hierarchy).

## Packet Order

1. `P001` Account context + import UX consistency
2. `P002` Alpha-aware marginal CPA + chart parity
3. `P003` Ads-ops readiness foundation
4. `P004` Account context completion
5. `P005` Scenario recommendations
6. `P006` Input, docs, and runtime hardening bundle
7. `P007` Ads integration and CI hardening
8. `P008` Per-entity target CPA contracts and UI
9. `P009` Confidence policy and gating semantics
10. `P010` Scenario step constraint UX clarity
11. `P011` Google Ads OAuth connect flow
12. `P012` Campaign-level granularity
13. `P013` Scenario deploy-to-platform
14. `P014` Editable target CPA control + persistence
15. `P015` Empty-state onboarding for no-data accounts
16. `P016` Navigation active-state visibility
17. `P017` Promote top-level "What To Do Now" action banner
18. `P018` Collapsible scenario planner + layout reorder
19. `P019` Cost-curve help tooltip for non-technical users
20. `P020` Save-scenario confirmation feedback
21. `P021` CSV auto-map collapse and review toggle
22. `P022` Dashboard structural loading skeleton
23. `P023` Mobile responsiveness polish for planner and charts

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
- `P015` depends on `P014`
- `P016` depends on `P015`
- `P017` depends on `P016`
- `P018` depends on `P017`
- `P019` depends on `P018`
- `P020` depends on `P019`
- `P021` depends on `P020`
- `P022` depends on `P021`
- `P023` depends on `P022`

## Branch / PR Naming

- Branch pattern: `codex/p00x-short-name`
- PR title pattern: `[P00X] short title`

## Enforcement Layer

The following controls are committed in-repo:

1. Handoff protocol:
   `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/HANDOFF_PROTOCOL.md`
2. PR template contract:
   `/Users/davidhickey/Documents/Projects/budgetradar/.github/PULL_REQUEST_TEMPLATE.md`
3. CI check for packet PR metadata and title:
   `/Users/davidhickey/Documents/Projects/budgetradar/.github/workflows/packet-pr-guardrails.yml`

## Rollout

### Day 1

1. Finalize packet docs in `docs/execution/packets/`.
2. Ensure `docs/execution/status.yaml` has one entry per packet.
3. Mark the first dependency-cleared packet as `Ready`.

### Day 2+

1. Work one packet at a time.
2. Move packet state via local doc lifecycle:
   - start work: `IN_PROGRESS` / `In Progress`
   - PR open (if used): `REVIEW` / `In Review`
   - merge: `DONE` / `Done`
3. Promote next dependency-cleared packet from `Backlog` to `Ready`.
4. Use CI guardrail failures as hard stop until PR metadata contract is fixed.

## Governance Rules

1. Packet docs are canonical implementation scope.
2. `status.yaml` is canonical operational status.
3. GitHub issues/projects are optional references, never prerequisites.
4. Scope changes require packet doc update before `status.yaml` update.
5. No packet starts without:
   - `execution_status: Ready`
   - explicit owner
   - dependencies cleared

## Status Schema

- `state`: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`
- `execution_status`: `Backlog`, `Ready`, `In Progress`, `Blocked`, `In Review`, `Done`
- Required per packet:
  - `id`, `title`, `state`, `execution_status`, `owner`, `branch`, `depends_on`, `spec_path`
- Optional per packet:
  - `issue_number`, `issue_url`, `project_item_id`, `pr_url`, `start_date`, `target_date`

## Validation Checklist

- `status.yaml` has packet entries for `P001` through `P023`.
- At most one packet is `In Progress` at any time.
- Each active packet has an owner and updated timestamp.
- Packet doc front matter and `status.yaml` agree on current state.
