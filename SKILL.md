---
name: quick-init
description: Use when initializing project governance structure, coding rules, documentation conventions, iteration archives, changelog flow, or Codex/Claude commit-governance hooks for a repository
---

# quick-init

## Overview

Initialize a target repository with project governance structure and agent-native workflow rules. This Skill creates directories and Markdown governance files only; it does not create business code or language package configuration.

## Required Flow

1. Confirm the target repository root.
2. Ask for project name.
3. Ask for one-sentence project goal.
4. Ask for primary language: `python`, `java`, `typescript`, or `generic`.
5. Ask whether to install Codex, Claude, or both.
6. Ask for first iteration name.
7. Create the seed iteration before installing the Git pre-commit guard.
8. Read templates from this Skill root under `templates/**`.
9. Remove old quick-init prototype artifacts when present.
10. Create the governance structure and seed iteration (for the chosen first iteration name).
11. Install selected agent integration files.
12. Install the Git pre-commit guard.
13. Run or request the selected agent's `commit-governance` workflow once.

## Generated Docs Model

Only generate these top-level docs:

- `docs/onboard/README.md`
- `docs/architecture/README.md`
- `docs/decisions/README.md`
- `docs/iterations/README.md`
- `docs/changelog.md`

Do not generate top-level `docs/specs/`, `docs/designs/`, `docs/verification/`, or `docs/research/`.

## Safety Rules

- Do not overwrite existing user content without showing a merge summary.
- Delete old quick-init CLI prototype files when this repository itself is being migrated.
- Use Codex `.codex/hooks.json` for Codex hooks.
- Use Claude `.claude/settings.json` for Claude hooks.
- Keep `.quick-init/` local and ignored.
