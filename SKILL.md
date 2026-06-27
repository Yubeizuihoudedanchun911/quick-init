---
name: quick-init
description: Initialize full vibecoding governance for a project from a natural-language description, including AI coding instructions, shared rules, docs, local archive state, hooks, and scoped initialization commit.
---

# quick-init

Use this skill when a user wants to initialize or maintain quick-init project governance.

## Initialize

Run:

```bash
quick-init init "<business description>"
```

The initializer derives a full-governance spec, writes AI tool entry files and `.coding-rules/`, creates project docs, configures local `.quick-init/` state, installs the pre-commit archive hook, creates the first iteration under `docs/iterations/`, and commits only quick-init-generated files.

The default subagent policy is intentionally narrow: generate `agents/documentation.md` as the only documentation subagent, and do not create unrelated default subagents.

## Archive

Run:

```bash
quick-init archive --staged
```

This command classifies staged Markdown, moves archiveable documents into `docs/iterations/`, writes `manifest.json` and `iteration.md`, and stages the archive result. If AI summary generation is unavailable, it degrades to a manifest-only archive instead of blocking the commit.

## Iteration

Run:

```bash
quick-init iteration status
quick-init iteration start "<name>"
quick-init iteration close
```

`iteration start` creates a local active iteration state in `.quick-init/state/active-iteration.json` with a dated slug and `docs/iterations/<iteration>` path. `iteration status` reports the active iteration when present, or `No active iteration` when none is open. `iteration close` marks the active iteration manifest as `closed` when it exists, then clears the local active iteration state.
