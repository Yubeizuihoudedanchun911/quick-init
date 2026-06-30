# quick-init

`quick-init` is a Skill-only project governance initializer. It is not an npm package and does not expose a CLI.

Use this repository as a local Skill source for a coding agent. The Skill asks a small set of questions, reads templates from this repository, and creates a target project's governance structure:

- `.coding-rules/**`
- agent entry instructions that point Codex, Claude, and Gemini at `.coding-rules/`
- `docs/onboard/`
- `docs/architecture/`
- `docs/decisions/`
- `docs/iterations/`
- `docs/changelog.md`
- `.quick-init/state/`, `.quick-init/hooks/`, and `.quick-init/rules/`
- Codex or Claude hook integration when selected
- a Git pre-commit guard

## Install From Source

Clone this repository into the Skill location supported by your coding agent.

```bash
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.codex/skills/quick-init
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.claude/skills/quick-init
```

Before implementation, verify the current official installation path for the agent you use.

## Init Flow

When invoked by a coding agent, this Skill asks for:

- project name
- one-sentence project goal
- primary language: `python`, `java`, `typescript`, `go`, `rust`, or `generic`
- which agent entry files to install: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`
- which hook integrations to install: Codex, Claude, or both
- first iteration name

The agent then reads the templates in this repository and creates the target repository's governance files directly. It creates the seed iteration before installing the Git pre-commit guard so the first guarded commit has the required `iteration.md`, `manifest.json`, and changelog state.

If `.quick-init/` already exists, the Skill runs an incremental update: it compares template hashes from `.quick-init/state/init-metadata.json`, refreshes managed coding rules and adapter files, and avoids replacing user-filled docs.

The repository version is stored in `VERSION`. Initialized projects record the quick-init version, source commit hash, selected language, and template hashes in `.quick-init/state/init-metadata.json`.

## Generated Project Shape

```text
.coding-rules/
.coding-rules/design-principles.md
.codex/
.claude/
docs/
  onboard/
  architecture/
  decisions/
  iterations/
  changelog.md
.quick-init/
  hooks/
  rules/
  state/
AGENTS.md
CLAUDE.md
GEMINI.md
```

`quick-init` creates governance files and directories only. It does not create package files, runtime configuration, business source code, or test examples for the target project.

## Agent Integrations

Selected integrations are rendered from `templates/agent-integrations/**`:

- Codex: `.codex/hooks.json`, `.codex/agents/commit-governance.toml`, and a hook trigger script.
- Claude: `.claude/settings.json`, `.claude/agents/commit-governance.md`, and a hook trigger wrapper.
- Shared trigger logic: `.quick-init/hooks/governance_trigger_core.py` and `.quick-init/hooks/intent-keywords.json`.
- Shared governance rules: `.quick-init/rules/commit-governance-core.md`.
- Git: a pre-commit guard checks staged governance state against `.quick-init/state/last-governance-run.json`.

Top-level agent entry files are rendered from `templates/agent-instructions/**`. They do not duplicate the rule bodies; they declare `.coding-rules/` as the shared project rule source and require the matching language-specific rule file when present.

Commit-governance work is delegated to the selected coding agent's subagent configuration. The main agent keeps the product task context clean while the subagent handles iteration manifest, changelog synchronization, and staged documentation checks.

## Development Checks

Repository validation uses Python 3 and pytest.

```bash
/opt/anaconda3/envs/py311env/bin/python -m pytest
```

Implementation work must keep the repository free of Node, npm, TypeScript, Vitest, old CLI entrypoints, and old generated docs directories.
