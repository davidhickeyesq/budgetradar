# Execution Decisions Log

## Locked Decisions

### 2026-02-17

1. Use GitHub Projects v2 (not classic).
2. Implement foundation only in first pass (no automations yet).
3. Represent Epic as parent issue with packet issues as sub-issues.
4. Execute one packet PR at a time to minimize merge risk.
5. Keep repo packet docs as canonical; project fields are operational mirror.

## Deferred Decisions

1. Whether to enforce PR contract with `.github/PULL_REQUEST_TEMPLATE.md`.
2. Whether to add issue templates for Epic/Packet.
3. Whether to add project automations in phase 2.
4. Whether to add CI check that enforces `[P00X]` PR title prefix.
