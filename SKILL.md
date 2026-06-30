---
name: quick-init
description: Use when initializing or updating project governance structure, coding rules, documentation conventions, iteration archives, changelog flow, or Codex/Claude commit-governance hooks for a repository
---

# quick-init

## Overview

Initialize or update a target repository with project governance structure and agent-native workflow rules. This Skill creates directories and Markdown governance files only; it does not create business code or language package configuration.

## Required Flow

1. Confirm Skill root templates are readable; abort if not.
2. Confirm the target repository root.
3. Detect whether quick-init governance already exists (`.quick-init/` present).
   - First init: run full initialization.
   - Already initialized: run incremental update (refresh templates and adapters without overwriting user content).
4. Ask for project name.
5. Ask for one-sentence project goal.
6. Ask for primary language.
7. Supported options: `python`, `java`, `typescript`, `go`, `rust`, or `generic`.
8. Ask which agent entry files to install (AGENTS.md, CLAUDE.md, GEMINI.md).
9. Ask which agent hook integrations to install (Codex, Claude, or both).
10. Ask for first iteration name.
11. Remove old quick-init prototype artifacts when present.
12. Ensure `.quick-init/` is in `.gitignore`.
13. Read templates from this Skill root under `templates/**`.
14. Create the governance structure.
15. Install agent entry instruction files from `templates/agent-instructions/**`.
16. Install selected agent integration files.
17. Copy `templates/subagents/commit-governance-core.md` to `.quick-init/rules/commit-governance-core.md`.
18. Copy `templates/hooks/governance-trigger-core.py.tmpl` to `.quick-init/hooks/governance_trigger_core.py`.
19. Copy `templates/hooks/intent-keywords.json` to `.quick-init/hooks/intent-keywords.json`.
20. Create the seed iteration before installing the Git pre-commit guard.
21. Install the Git pre-commit guard.
22. Write `.quick-init/state/init-metadata.json` with version, commit hash, language, and template hashes.
23. Run or request the selected agent's `commit-governance` workflow once.

## Generated Docs Model

Only generate these top-level docs:

- `docs/onboard/README.md`
- `docs/architecture/README.md`
- `docs/decisions/README.md`
- `docs/iterations/README.md`
- `docs/changelog.md`

Do not generate top-level `docs/specs/`, `docs/designs/`, `docs/verification/`, or `docs/research/`.

## Incremental Update

When `.quick-init/` exists, read `.quick-init/state/init-metadata.json` and compare template hashes. Only refresh files whose templates have changed. Merge strategy:

- `.coding-rules/**`: replace (managed by quick-init).
- `docs/**`: do not replace (user-filled content).
- agent integration configs: update quick-init marker blocks only.
- agent entry instructions: append new rules, do not delete user additions.

## Safety Rules

- Do not overwrite existing user content without showing a merge summary.
- Delete old quick-init CLI prototype files when this repository itself is being migrated.
- Agent entry instruction files must tell agents to follow `.coding-rules/generic.md`, `.coding-rules/design-principles.md`, `.coding-rules/documentation.md`, `.coding-rules/git-workflow.md`, and the matching language-specific coding rule when present.
- Use Codex `.codex/hooks.json` for Codex hooks.
- Use Claude `.claude/settings.json` for Claude hooks.
- Keep `.quick-init/` local and ignored.
