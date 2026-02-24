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
- `packets/P004-account-context-completion.md`
- `packets/P005-scenario-recommendations.md`
- `packets/P006-data-quality-confidence.md`
- `packets/P007-ads-integration-ci-hardening.md`
- `packets/P008-dynamic-target-cpa.md`
- `packets/P009-hard-gate-low-confidence.md`
- `packets/P010-explain-scenario-constraint.md`
- `packets/P011-google-ads-oauth-flow.md`
- `packets/P012-campaign-granularity.md`
- `packets/P013-scenario-deploy-platform.md`
- `packets/P014-editable-target-cpa-control.md`
- `packets/P015-empty-state-onboarding.md`
- `packets/P016-nav-active-state.md`
- `packets/P017-promote-next-action-banner.md`
- `packets/P018-collapsible-scenario-planner-layout.md`
- `packets/P019-cost-curve-help-tooltip.md`
- `packets/P020-scenario-save-feedback.md`
- `packets/P021-csv-automap-collapse.md`
- `packets/P022-dashboard-loading-skeleton.md`
- `packets/P023-mobile-responsive-polish.md`
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

## Minimal Control Loop

Use this lightweight loop for every packet. Do not add extra process unless this
fails repeatedly.

1. Kickoff prompt must include:
   `Before coding, set Project Execution Status for this packet to In Progress and confirm it in your first reply.`
2. Completion prompt must include:
   `Before done, set Project Execution Status for this packet to In Review and post the PR URL.`
3. Human owner moves packet from `In Review` to `Done` after merge.
4. Then promote the next dependency-cleared packet to `Ready`.
