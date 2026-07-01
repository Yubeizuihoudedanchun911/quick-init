# Commit Governance Core

## Purpose

Shared rules for all commit-governance modes. Each mode loads this file plus its own mode-specific prompt.

## Allowed Writes

- `docs/**`
- `.quick-init/state/**`

## Disallowed Writes

- Business source code
- Test files
- Dependency files (package.json, pyproject.toml, etc.)
- Runtime configuration outside selected agent integration files
- Destructive git operations (push, reset, checkout, rebase)

## Iteration Directory

```text
docs/iterations/YYYY-MM-DD-topic-slug/
  iteration.md
  manifest.json
  <archived documents — flat, no subdirectories>
```

Slug rules:

- 保留中文, English letters, numbers, hyphens, and underscores.
- Collapse whitespace to one hyphen.
- Remove path separators, control characters, and shell special characters.
- Limit to 80 Unicode characters.
- Use `iteration` when empty.
- Append `-2`, `-3`, and higher suffixes on path conflict.

## Manifest Format

```json
{
  "iteration": "YYYY-MM-DD-<topic-slug>",
  "status": "active",
  "documents": [
    {
      "sourcePath": "<original path>",
      "targetPath": "<path in iteration dir>",
      "category": "<spec|plan|design|research|other>",
      "action": "<archive|unclassified>",
      "sha256": "<hash>"
    }
  ]
}
```

## Failure Handling

Failures must not block the commit. Report failures in the summary returned to the main agent.
