# Planning Documentation Index

This directory contains Product Requirements Documents (PRDs) and implementation plans for major features and refactors.

## Active PRDs

| ID | Name | Status | Date | Description |
|----|------|--------|------|-------------|
| [001](./001-local-first-refactor/) | Local-First Refactor | In Progress | 2026-02-15 | Transform to Docker Compose orchestration with zero cloud dependencies |

## Completed PRDs

*None yet*

## Archived PRDs

*None yet*

---

## How to Use This Directory

### For Planning New Work

1. **Create a new numbered folder**: `002-descriptive-name/`
2. **Copy template structure** from PRD 001:
   - `PRD.md` - Product requirements and context
   - `IMPLEMENTATION_GUIDE.md` - Step-by-step technical instructions
   - `TODO_CHECKLIST.md` - Granular task checklist
   - `EXECUTION_NOTES.md` - Quick reference and troubleshooting
   - `README.md` - Overview of the PRD
3. **Update this index** with the new entry

### For Executing Work

1. Navigate to the PRD folder (e.g., `001-local-first-refactor/`)
2. Start with the `README.md` for overview
3. Follow the reading order: **PRD.md → IMPLEMENTATION_GUIDE.md → TODO_CHECKLIST.md**
4. Keep `EXECUTION_NOTES.md` handy for quick reference

### Numbering Convention

- **001-099**: Foundation and infrastructure changes
- **100-199**: Core features
- **200-299**: Integrations and external APIs
- **300-399**: UI/UX improvements
- **400+**: Experimental or future work

---

## Quick Links

- [Project Context](../project-context.md) - Original problem statement and core math
- [AGENTS.md](../../AGENTS.md) - Full architectural decisions
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines for Claude Code
