# Commit Governance Core

## Purpose

Handle commit-time project governance without loading full staged diff into the main agent context.

## Inputs

- repository root
- active iteration state: `.quick-init/state/active-iteration.json`
- last governance run: `.quick-init/state/last-governance-run.json`
- staged Markdown files from `git diff --cached --name-only`

## Allowed Writes

- `docs/iterations/**`
- `docs/changelog.md`
- `.quick-init/state/last-governance-run.json`

## Disallowed Writes

- business source code
- dependency files
- runtime configuration outside selected agent integration files
- destructive git operations

## Classification

Actions:

- `archive`: move the staged Markdown into the current iteration.
- `summarize-only`: keep the source in place and record it in `iteration.md` and `manifest.json`.
- `skip`: ignore empty files, placeholder files, and existing `docs/iterations/**` archive files.

Categories:

- `specs/`: paths or headings with `spec`, `requirement`, `prd`, `story`, `需求`, `规格`, or `用户故事`.
- `plans/`: paths or headings with `plan`, `design`, `implementation`, `verification`, `计划`, `设计`, `实现`, or `验证`.

Summarize-only paths:

- `docs/onboard/**`
- `docs/architecture/**`
- `docs/decisions/**`
- `docs/changelog.md`
- `.coding-rules/**`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.codex/**`
- `.claude/**`

If classification is unclear, stop and report `unclear`; do not move the file.

## Iteration Shape

```text
docs/iterations/YYYY-MM-DD-topic-slug/
  iteration.md
  manifest.json
  specs/
  plans/
```

Slug rules:

- 保留中文, English letters, numbers, hyphens, and underscores.
- Collapse whitespace to one hyphen.
- Remove path separators, control characters, and shell special characters.
- Limit to 80 Unicode characters.
- Use `iteration` when empty.
- Append `-2`, `-3`, and higher suffixes on path conflict.

## Changelog

When the active iteration changed, summarize the previous iteration into `docs/changelog.md` before archiving current staged docs. Update the previous `manifest.json` with `status = "closed"` and `changelogSynced = true`.

## Finalizing

After completing all archive, manifest, and changelog operations and staging all changed files with `git add`, run the finalize script:

```bash
python3 .quick-init/hooks/finalize-governance.py <active-iteration-slug>
```

Do NOT compute `stagedDocsHash` manually. The finalize script uses the same hash algorithm as the commit trigger and writes `.quick-init/state/last-governance-run.json` automatically. This prevents hash mismatches that cause infinite block loops.

Return only a short summary to the main agent.
