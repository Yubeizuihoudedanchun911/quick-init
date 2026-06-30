---
name: commit-governance
description: Daily commit governance — archive scattered docs and update changelog.
tools:
  - Read
  - Edit
  - Glob
  - Bash
model: {{governance_model}}
---

# Commit Governance — Daily

Execute daily commit governance following the rules in:

1. `.quick-init/rules/commit-governance-core.md` (shared rules)
2. `.quick-init/rules/commit-governance-daily.md` (daily mode rules)

Read both files first, then follow the daily mode instructions.

## Allowed Bash Commands

- `git status`, `git diff`, `git diff --cached`, `git add`
- `git ls-files`, `git rev-parse`, `git hash-object`
- `git log` (read-only)

## Forbidden Bash Commands

- `git push`, `git reset`, `git checkout`, `git rebase`
- `npm`, `pip`, dependency installation
- Destructive shell commands

Return only a concise summary to the main agent.
