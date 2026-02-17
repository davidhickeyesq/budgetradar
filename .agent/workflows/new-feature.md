---
description: How to create, develop, and ship a new feature or change
---

# New Feature Workflow

Every new feature, bug fix, or change gets its own branch and PR. No committing directly to `main`.

## 1. Start from a clean `main`

// turbo
```bash
git checkout main && git pull origin main
```

## 2. Create a feature branch

Use the naming convention:
- `feat/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — maintenance, deps, docs

```bash
git checkout -b feat/<branch-name>
```

## 3. Make your changes

- Implement the feature
- Test it locally (check the browser, run `make dev` if containers are down)
- Keep commits focused — one logical change per commit

## 4. Stage and commit

```bash
git add <changed-files>
git commit -m "<type>: <concise description>

- bullet point details of what changed and why"
```

Commit message types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`

## 5. Push and create a PR

```bash
git push -u origin feat/<branch-name>
```

Then create the PR targeting `main`:

```bash
gh pr create --title "<type>: <Title>" --body "<description>" --base main
```

## 6. Resolve conflicts (if any)

If the PR has conflicts:

```bash
git fetch origin main
git merge origin/main --no-edit
# Resolve any conflicts in the affected files
git add <resolved-files>
git commit -m "fix: resolve merge conflicts with main"
git push origin feat/<branch-name>
```

## 7. Merge

Once the PR is approved/reviewed, merge via GitHub (or ask the user to merge).
After merge, clean up locally:

// turbo
```bash
git checkout main && git pull origin main
```

---

## ⚠️ Rules

- **Always branch from `main`** — never from another feature branch (this avoids cascading merge conflicts)
- **One feature per branch** — don't mix unrelated changes
- **Keep branches short-lived** — merge promptly, don't let them drift from `main`
- **Pull `main` before branching** — always start fresh
