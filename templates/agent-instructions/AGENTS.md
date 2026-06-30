# AGENTS.md Instructions

- Follow `.coding-rules/generic.md` for shared engineering rules.
- Follow `.coding-rules/design-principles.md` for design and code quality principles.
- Follow `.coding-rules/documentation.md` for documentation changes.
- Follow `.coding-rules/git-workflow.md` for commit, staging, and governance workflow.
- For source changes, follow the selected language rule in `.coding-rules/` when present: `python.md`, `java.md`, `typescript.md`, `go.md`, or `rust.md`.
- If the project uses `generic` as its primary language, rely on `.coding-rules/generic.md`.
- Keep `.quick-init/` local and uncommitted.
- Use the Codex agents/ configuration to run the commit-governance subagent.
- Follow the `.codex/hooks.json` hook contract for commit-time governance.
