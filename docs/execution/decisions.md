# Execution Decisions Log

## Locked Decisions

### 2026-02-17 (superseded by 2026-02-25 workflow)

1. Use GitHub Projects v2 (not classic).
2. Implement foundation only in first pass (no automations yet).
3. Represent Epic as parent issue with packet issues as sub-issues.
4. Execute one packet PR at a time to minimize merge risk.
5. Keep repo packet docs as canonical; project fields are operational mirror.
6. Enforce packet PR metadata with in-repo PR template + CI guardrail.

### 2026-02-25

1. Repo packet docs plus `status.yaml` are the only required execution system.
2. GitHub issues/projects are optional references and are not required for packet start/finish.
3. Packet handoff status transitions must be recorded locally (packet front matter + `status.yaml`).
4. Keep packet PR metadata guardrails, but do not require an `Issue:` line.

## Deferred Decisions

1. Whether to keep any external mirror (GitHub/Linear) after packet completion.
2. Whether to add local automation around `status.yaml` consistency checks.
