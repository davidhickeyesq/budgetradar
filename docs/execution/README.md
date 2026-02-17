# Execution Docs

This directory is the canonical planning and execution source of truth for
multi-agent delivery in BudgetRadar.

## Purpose

- Store packet-level implementation specs in versioned markdown.
- Keep project-level state mirrored in GitHub Projects (operational board).
- Make handoff deterministic across Codex and Google Anti-Gravity.

## Canonical vs Mirror

- Canonical: packet markdown files in `docs/execution/packets/`.
- Mirror: GitHub Project fields/status for work visibility and triage.
- Project URL: `https://github.com/users/davidhickeyesq/projects/5`

If state drifts, update packet docs first and then mirror into GitHub Project.

## View Configuration Note

GitHub CLI and public GraphQL mutations do not currently support creating
Project views programmatically. Configure/rename views in the GitHub web UI.

## Files

- `MASTER_PLAN.md`: overall sequence, workflow, and governance.
- `HANDOFF_PROTOCOL.md`: exact start/update/PR/merge handoff rules.
- `packets/P001-account-context.md`
- `packets/P002-alpha-parity.md`
- `packets/P003-ads-ops-readiness.md`
- `status.yaml`: machine-readable packet status index.
- `decisions.md`: locked decisions and rationale.

## Enforcement

- PR template: `/Users/davidhickey/Documents/Projects/budgetradar/.github/PULL_REQUEST_TEMPLATE.md`
- CI guardrail workflow:
  `/Users/davidhickey/Documents/Projects/budgetradar/.github/workflows/packet-pr-guardrails.yml`

## PR Contract

All packet PRs must:

1. Prefix title with packet ID (for example: `[P001] ...`).
2. Link the packet issue and `Spec Path`.
3. Include a `Validation` section with exact commands/results.

Non-packet execution-infra PRs must use `[CHORE]` or `[EPIC]` prefix and still
include a `Validation` section.
