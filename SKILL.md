---
name: quick-init
description: Use when initializing project governance structure, coding rules, documentation conventions, iteration archives, changelog flow, or Codex/Claude commit-governance hooks for a repository
---

# quick-init

## Overview

Initialize a target repository with project governance structure and agent-native workflow rules. This Skill creates directories and Markdown governance files only; it does not create business code or language package configuration.

## Required Flow

1. Confirm the target repository root.
2. Ask for project name and one-sentence project goal.
3. Ask for primary language: `python`, `java`, `typescript`, or `generic`.
4. Ask whether to install Codex integration, Claude integration, or both.
5. Ask for the first iteration name, defaulting to `初始化项目治理`.
6. Read templates from this Skill root under `templates/**`.
7. Remove old quick-init prototype artifacts when present.
8. Create the governance structure and seed iteration.
9. Install selected agent integration files.
10. Install the Git pre-commit guard.
11. Run or request the selected agent's `commit-governance` workflow once.

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
