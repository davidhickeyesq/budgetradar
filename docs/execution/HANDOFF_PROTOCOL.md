# Handoff Protocol (Cross-Agent)

Use this protocol for every packet handoff across Codex and Google Anti-Gravity.

## Canonical Sources

1. `/Users/davidhickey/Documents/Projects/budgetradar/AGENTS.md`
2. `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/README.md`
3. `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/status.yaml`
4. Packet spec in `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/`

Repo packet docs are canonical. GitHub Project is an operational mirror.

## Start Protocol

1. Read canonical sources in order.
2. Select only one packet with `execution_status: Ready`.
3. Verify dependencies in packet front matter and `status.yaml`.
4. Work on branch: `codex/p00x-short-name`.
5. Set packet front matter before code changes:
   - `state: IN_PROGRESS`
   - `owner: <agent or human handle>`
   - `updated_at: <YYYY-MM-DD>`
6. Mirror status in GitHub Project:
   - `Execution Status -> In Progress`
   - set `Branch`
   - set `Start Date`

## During Work

1. Do not change packet scope without editing packet doc first.
2. Keep linked issue and packet doc in sync with implementation decisions.
3. Keep one packet in progress at any time.

## PR Protocol

1. PR title must start with `[P00X]`.
2. PR body must include:
   - `Packet ID: P00X`
   - `Spec Path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P00X-...`
   - `Issue: #<number>`
   - `## Validation`
3. On PR open:
   - packet front matter `state: REVIEW`
   - packet `pr: <url>`
   - `updated_at` refreshed
   - GitHub Project `Execution Status -> In Review`
   - set `PR URL`

## Merge Protocol

1. On merge:
   - packet front matter `state: DONE`
   - `updated_at` refreshed
   - GitHub Project `Execution Status -> Done`
2. Promote next packet:
   - next dependency-cleared packet `execution_status: Ready`
   - update GitHub Project `Execution Status -> Ready`
3. Update `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/status.yaml`.

## Conflict Rule

If GitHub Project and repo packet docs disagree, repo docs win. Update repo first,
then mirror to project.
