# Execution Docs

This directory is the canonical planning and execution source of truth for
multi-agent delivery in BudgetRadar.

## Purpose

- Store packet-level implementation specs in versioned markdown.
- Track packet state directly in repo docs (`packets/*.md` + `status.yaml`).
- Make handoff deterministic across Codex and Google Anti-Gravity.

## Tracking Model

- Canonical: packet markdown files in `docs/execution/packets/`.
- Canonical: `docs/execution/status.yaml` for machine-readable status.
- Optional mirror: GitHub issues/projects, if you choose to keep them.

If state drifts, update packet docs and `status.yaml` first.

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
2. Include `Packet ID` and `Spec Path`.
3. Include a `Validation` section with exact commands/results.
4. Include issue/project links only if you are actively using them.

Non-packet execution-infra PRs must use `[CHORE]` or `[EPIC]` prefix and still
include a `Validation` section.

## Minimal Control Loop

Use this lightweight loop for every packet. Do not add extra process unless this
fails repeatedly.

1. Kickoff prompt must include:
   `Before coding, set packet front matter state to IN_PROGRESS and set status.yaml execution_status to In Progress; confirm in your first reply.`
2. Completion prompt must include:
   `Before done, set packet front matter state to REVIEW, update status.yaml, and post PR URL if one exists.`
3. On merge, set packet state to `DONE` and `execution_status` to `Done`.
4. Then promote the next dependency-cleared packet to `Ready`.
