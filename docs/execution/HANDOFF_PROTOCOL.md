# Handoff Protocol (Cross-Agent)

Use this protocol for every packet handoff across Codex and Google Anti-Gravity.

## Canonical Sources

1. `/Users/davidhickey/Documents/Projects/budgetradar/AGENTS.md`
2. `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/README.md`
3. `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/status.yaml`
4. Packet spec in `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/`

Repo packet docs plus `status.yaml` are canonical. GitHub issues/projects are optional mirrors.

## Operator Prompt Contract

When assigning a packet to any agent, include both lines exactly:

1. `Before coding, set packet front matter state to IN_PROGRESS and set status.yaml execution_status to In Progress; confirm it in your first reply.`
2. `Before done, set packet front matter state to REVIEW, update status.yaml, and post PR URL only if one exists.`

This is the default operating contract. Keep it simple and consistent.

## Start Protocol

1. Read canonical sources in order.
2. Select only one packet with `execution_status: Ready`.
3. Verify dependencies in packet front matter and `status.yaml`.
4. Work on branch: `codex/p00x-short-name`.
5. Set packet front matter before code changes:
   - `state: IN_PROGRESS`
   - `execution_status: In Progress`
   - `owner: <agent or human handle>`
   - `updated_at: <YYYY-MM-DD>`
6. Update matching packet in `status.yaml`:
   - `state: IN_PROGRESS`
   - `execution_status: In Progress`
   - set `branch`
   - set `start_date` if known
7. First reply in chat must explicitly confirm local status files were updated.

## During Work

1. Do not change packet scope without editing packet doc first.
2. Keep packet doc and `status.yaml` in sync with implementation decisions.
3. Keep one packet in progress at any time.

## PR Protocol

1. PR title must start with `[P00X]`.
2. PR body must include:
   - `Packet ID: P00X`
   - `Spec Path: /Users/davidhickey/Documents/Projects/budgetradar/docs/execution/packets/P00X-...`
   - `## Validation`
3. `Issue:` and project links are optional metadata.
4. On PR open:
   - packet front matter `state: REVIEW`
   - packet `execution_status: In Review`
   - packet `pr: <url>` (if PR exists)
   - `updated_at` refreshed
   - update `status.yaml` for the same packet (`state: REVIEW`, `execution_status: In Review`, `pr_url` if present)
5. Final reply must include PR URL if one exists and confirm status is `In Review`.

## Merge Protocol

1. On merge:
   - packet front matter `state: DONE`
   - packet front matter `execution_status: Done`
   - `updated_at` refreshed
   - update `status.yaml` (`state: DONE`, `execution_status: Done`)
2. Promote next packet:
   - next dependency-cleared packet `execution_status: Ready`
   - update both packet front matter and `status.yaml`
3. Update `/Users/davidhickey/Documents/Projects/budgetradar/docs/execution/status.yaml`.

## Conflict Rule

If packet front matter and `status.yaml` disagree, packet front matter wins.
Update packet doc first, then sync `status.yaml`.
