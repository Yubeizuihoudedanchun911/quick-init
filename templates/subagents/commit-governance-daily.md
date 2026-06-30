# Commit Governance — Daily Mode

Triggered on every `git commit` / `git push` via PreToolUse hook. Runs silently; does not block the commit.

## Scatter-Doc Archiving

Scan staged files and identify process documents (spec, design, plan, research, technical investigation, PRD, user story, comparison, verification report, etc.) regardless of which tool generated them or where they live.

Move identified documents into the current iteration directory (`docs/iterations/<slug>/`) with a flat layout (no subdirectories).

### Do Not Archive

- Files already in `docs/iterations/`
- Files in structured reference documentation directories under `docs/`
- `docs/changelog.md`
- `.coding-rules/**`
- Agent config files (`.codex/**`, `.claude/**`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`)
- `README.md`

### Uncertain Files

When you cannot determine whether a file is a process document, do not move it. Record it in `manifest.json` with `"action": "unclassified"` and leave it for the developer to handle.

## Changelog

Append one line at the top of `docs/changelog.md` for this commit:

```text
- **<type>**: <one-line summary> (<short hash>)
```

Infer type from the commit message: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`.

Append a changelog entry for every commit, including pure code commits with no documents.

## Finish

Stage all archive and changelog changes with `git add`. Return a short summary to the main agent.
