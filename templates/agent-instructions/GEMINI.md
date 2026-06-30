# Gemini Instructions

- Follow `.coding-rules/generic.md` for shared engineering rules.
- Follow `.coding-rules/design-principles.md` for design and code quality principles.
- Follow `.coding-rules/documentation.md` for documentation changes.
- Follow `.coding-rules/git-workflow.md` for commit, staging, and governance workflow.
- For source changes, follow the selected language rule in `.coding-rules/` when present: `python.md`, `java.md`, `typescript.md`, `go.md`, or `rust.md`.
- If the project uses `generic` as its primary language, rely on `.coding-rules/generic.md`.
- Keep `.quick-init/` local and uncommitted.
- No automatic hook integration is available; run commit-governance manually before committing when staged Markdown has changed.
