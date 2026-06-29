# Codex Adapter

Install these generated files into the target repository:

- `.codex/hooks.json`
- `.codex/agents/commit-governance.toml`
- `.codex/hooks/commit-governance-trigger.py`

Before implementation, confirm the current Codex official schema from:

- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/config-advanced
- https://developers.openai.com/codex/subagents

Hook trigger command should use `$(git rev-parse --show-toplevel)` to resolve the script path in the target repository.
