# Skill-only Quick Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current TypeScript CLI prototype with a Skill-only quick-init template repository that generates project governance structure, coding rules, docs rules, Codex/Claude integrations, and a Git guard without npm or Node.

**Architecture:** The repository becomes a Skill plus Markdown/templates library. Python + pytest provide repository validation, snapshot checks, hook guard tests, slug tests, and rule fixture tests. Runtime intelligence remains in coding-agent hooks and the generated `commit-governance` subagent; Git hooks only guard invariants.

**Tech Stack:** Markdown Skill files, `.tmpl` templates, Python 3 standard library, pytest, Git. No Node, npm, TypeScript, Vitest, or legacy CLI.

## Global Constraints

- Current project is in test stage with no production users; delete old CLI content instead of preserving compatibility.
- Do not keep a `legacy/` directory.
- Do not provide npm CLI entrypoints or `quick-init init/archive/iteration` commands.
- First version supports Codex and Claude agent integrations only.
- Codex integration writes `.codex/hooks.json` and `.codex/agents/commit-governance.toml`.
- Claude integration writes `.claude/settings.json` and `.claude/agents/commit-governance.md`.
- Other coding agents are not selectable until their official hook/config docs are researched.
- Target generated docs model is only `docs/onboard/`, `docs/architecture/`, `docs/decisions/`, `docs/iterations/`, and `docs/changelog.md`.
- Target generated iteration directories contain only `iteration.md`, `manifest.json`, `specs/`, and `plans/`.
- Tests run with Python 3 + pytest only.
- File edits in this repository must use the configured beforeEditFile/afterEditFile recording flow.
- Java file headers, if any are introduced later, must use `@author jijunling <jijunling@kuaishou.com>`.

---

## File Structure

Final repository structure after implementation:

```text
README.md
SKILL.md
.gitignore
pytest.ini
templates/
  project-structure/
    generic.md
  coding-rules/
    generic.md
    documentation.md
    git-workflow.md
    python.md
    java.md
    typescript.md
  docs/
    onboard.md
    architecture.md
    decision.md
    iteration.md
    changelog.md
  agent-integrations/
    codex/
      README.md
      hooks.json.tmpl
      agents/
        commit-governance.toml.tmpl
      hooks/
        trigger.py.tmpl
    claude/
      README.md
      settings.json.tmpl
      agents/
        commit-governance.md.tmpl
      hooks/
        trigger.sh.tmpl
  subagents/
    commit-governance-core.md
  hooks/
    git-pre-commit-guard.py.tmpl
tests/
  conftest.py
  test_repository_cleanup.py
  test_templates.py
  test_adapter_snapshots.py
  test_guard_script.py
  test_rules.py
  test_slug_rules.py
  fixtures/
    snapshots/
      codex/
        hooks.json
        agents/
          commit-governance.toml
      claude/
        settings.json
        agents/
          commit-governance.md
    repos/
      README.md
docs/
  superpowers/
    specs/
      2026-06-29-skill-only-quick-init-design.md
    plans/
      2026-06-29-skill-only-quick-init.md
```

Delete old implementation paths:

```text
package.json
package-lock.json
tsconfig.json
vitest.config.ts
cli.ts
src/
tests/git/
tests/init/
tests/archive/
tests/local/
tests/iteration/
tests/helpers/tempRepo.ts
tests/cli.test.ts
tests/e2e.test.ts
tests/tempRepo.test.ts
dist/
node_modules/
```

Keep `docs/superpowers/**` as development artifacts for this repository. It is not part of generated target-project docs.

---

### Task 1: Remove CLI Surface And Establish Python Test Harness

**Files:**
- Delete: `package.json`
- Delete: `package-lock.json`
- Delete: `tsconfig.json`
- Delete: `vitest.config.ts`
- Delete: `cli.ts`
- Delete: `src/`
- Delete: `tests/git/`
- Delete: `tests/init/`
- Delete: `tests/archive/`
- Delete: `tests/local/`
- Delete: `tests/iteration/`
- Delete: `tests/helpers/tempRepo.ts`
- Delete: `tests/cli.test.ts`
- Delete: `tests/e2e.test.ts`
- Delete: `tests/tempRepo.test.ts`
- Delete: `dist/`
- Delete: `node_modules/`
- Create: `.gitignore`
- Create: `pytest.ini`
- Create: `tests/conftest.py`
- Create: `tests/test_repository_cleanup.py`

**Interfaces:**
- Consumes: current repository tree.
- Produces: pytest-only validation harness; no Node/npm files remain.

- [ ] **Step 1: Record files before deleting tracked content**

Run:

```bash
rtk git status --short --branch
rtk git ls-files package.json package-lock.json tsconfig.json vitest.config.ts cli.ts src tests
```

Expected:

```text
tracked old CLI files are listed
unrelated untracked files remain unstaged
```

- [ ] **Step 2: Delete old CLI files and old tests**

Use file deletion operations for tracked old content:

```bash
rm -rf package.json package-lock.json tsconfig.json vitest.config.ts cli.ts src tests dist node_modules
```

Expected:

```text
old CLI implementation is absent from working tree
```

- [ ] **Step 3: Create pytest config**

Create `pytest.ini`:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
addopts = -q
```

- [ ] **Step 4: Create repository ignore rules**

Create `.gitignore`:

```gitignore
.pytest_cache/
__pycache__/
*.pyc
.DS_Store
.weaver/
dist/
node_modules/
```

- [ ] **Step 5: Create pytest helpers**

Create `tests/conftest.py`:

```python
from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def assert_not_contains(text: str, forbidden: list[str]) -> None:
    found = [item for item in forbidden if item in text]
    assert found == []
```

- [ ] **Step 6: Write cleanup regression tests**

Create `tests/test_repository_cleanup.py`:

```python
from __future__ import annotations

from pathlib import Path

from conftest import REPO_ROOT, assert_not_contains, read_text


DELETED_PATHS = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vitest.config.ts",
    "cli.ts",
    "src",
]


def test_old_cli_paths_are_removed() -> None:
    for relative_path in DELETED_PATHS:
        assert not (REPO_ROOT / relative_path).exists(), relative_path


def test_readme_and_skill_do_not_advertise_old_cli_commands() -> None:
    for relative_path in ["README.md", "SKILL.md"]:
        text = read_text(relative_path)
        assert_not_contains(
            text,
            [
                "quick-init init",
                "quick-init archive",
                "quick-init iteration",
                "npm link",
                "npm install",
            ],
        )
```

- [ ] **Step 7: Run cleanup tests**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_repository_cleanup.py -q
```

Expected:

```text
2 passed
```

- [ ] **Step 8: Commit task 1**

Run:

```bash
rtk git add -- .gitignore pytest.ini tests/conftest.py tests/test_repository_cleanup.py README.md SKILL.md
rtk git add -u -- package.json package-lock.json tsconfig.json vitest.config.ts cli.ts src tests dist node_modules
rtk git diff --cached --check
rtk git commit -m "chore: remove legacy cli surface"
```

Expected:

```text
commit created
```

### Task 2: Rewrite README And SKILL As Skill-only Entrypoints

**Files:**
- Modify: `README.md`
- Modify: `SKILL.md`
- Modify: `tests/test_repository_cleanup.py`

**Interfaces:**
- Consumes: pytest harness from Task 1.
- Produces: user-facing Skill-only instructions and Skill trigger description.

- [ ] **Step 1: Replace README**

Write `README.md`:

```markdown
# quick-init

`quick-init` is a Skill-only project governance initializer. It is not an npm package and does not expose a CLI.

Use this repository as a local Skill source for a coding agent. The Skill asks a small set of questions, reads templates from this repository, and creates a target project's governance structure:

- `.coding-rules/**`
- `docs/onboard/`
- `docs/architecture/`
- `docs/decisions/`
- `docs/iterations/`
- `docs/changelog.md`
- Codex or Claude hook integration when selected
- a Git pre-commit guard

## Install From Source

Clone this repository into the Skill location supported by your coding agent.

```bash
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.codex/skills/quick-init
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.claude/skills/quick-init
```

Before implementation, verify the current official installation path for the agent you use.

## Generated Project Shape

```text
.coding-rules/
docs/
  onboard/
  architecture/
  decisions/
  iterations/
  changelog.md
.quick-init/
AGENTS.md
CLAUDE.md
GEMINI.md
```

`quick-init` creates governance files and directories only. It does not create package files, runtime configuration, business source code, or test examples for the target project.

## Development

Repository validation uses Python 3 and pytest.

```bash
/opt/anaconda3/envs/py311env/bin/python -m pytest
```
```

- [ ] **Step 2: Replace SKILL.md**

Write `SKILL.md`:

```markdown
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
```

- [ ] **Step 3: Extend README/SKILL tests**

Modify `tests/test_repository_cleanup.py`:

```python
from __future__ import annotations

from pathlib import Path

from conftest import REPO_ROOT, assert_not_contains, read_text


DELETED_PATHS = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vitest.config.ts",
    "cli.ts",
    "src",
]


def test_old_cli_paths_are_removed() -> None:
    for relative_path in DELETED_PATHS:
        assert not (REPO_ROOT / relative_path).exists(), relative_path


def test_readme_and_skill_do_not_advertise_old_cli_commands() -> None:
    for relative_path in ["README.md", "SKILL.md"]:
        text = read_text(relative_path)
        assert_not_contains(
            text,
            [
                "quick-init init",
                "quick-init archive",
                "quick-init iteration",
                "npm link",
                "npm install",
            ],
        )


def test_skill_mentions_real_agent_hook_locations() -> None:
    skill = read_text("SKILL.md")
    assert ".codex/hooks.json" in skill
    assert ".claude/settings.json" in skill
```

- [ ] **Step 4: Run README/SKILL tests**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_repository_cleanup.py -q
```

Expected:

```text
3 passed
```

- [ ] **Step 5: Commit task 2**

Run:

```bash
rtk git add -- README.md SKILL.md tests/test_repository_cleanup.py
rtk git diff --cached --check
rtk git commit -m "docs: rewrite skill-only entrypoints"
```

Expected:

```text
commit created
```

### Task 3: Add Core Markdown Templates

**Files:**
- Create: `templates/project-structure/generic.md`
- Create: `templates/coding-rules/generic.md`
- Create: `templates/coding-rules/documentation.md`
- Create: `templates/coding-rules/git-workflow.md`
- Create: `templates/coding-rules/python.md`
- Create: `templates/coding-rules/java.md`
- Create: `templates/coding-rules/typescript.md`
- Create: `templates/docs/onboard.md`
- Create: `templates/docs/architecture.md`
- Create: `templates/docs/decision.md`
- Create: `templates/docs/iteration.md`
- Create: `templates/docs/changelog.md`
- Create: `tests/test_templates.py`

**Interfaces:**
- Consumes: pytest helper `read_text`.
- Produces: template inventory and structural tests for later adapter rendering.

- [ ] **Step 1: Write template inventory test**

Create `tests/test_templates.py`:

```python
from __future__ import annotations

from conftest import REPO_ROOT, read_text


REQUIRED_TEMPLATES = [
    "templates/project-structure/generic.md",
    "templates/coding-rules/generic.md",
    "templates/coding-rules/documentation.md",
    "templates/coding-rules/git-workflow.md",
    "templates/coding-rules/python.md",
    "templates/coding-rules/java.md",
    "templates/coding-rules/typescript.md",
    "templates/docs/onboard.md",
    "templates/docs/architecture.md",
    "templates/docs/decision.md",
    "templates/docs/iteration.md",
    "templates/docs/changelog.md",
]


def test_required_templates_exist_and_have_headings() -> None:
    for relative_path in REQUIRED_TEMPLATES:
        path = REPO_ROOT / relative_path
        assert path.exists(), relative_path
        text = path.read_text(encoding="utf-8")
        assert text.startswith("# "), relative_path
        assert "{{" not in text, relative_path


def test_docs_template_excludes_removed_top_level_dirs() -> None:
    text = read_text("templates/project-structure/generic.md")
    assert "docs/onboard/" in text
    assert "docs/architecture/" in text
    assert "docs/decisions/" in text
    assert "docs/iterations/" in text
    assert "docs/changelog.md" in text
    assert "docs/verification/" not in text
    assert "docs/research/" not in text
```

- [ ] **Step 2: Run template test and observe failure**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py -q
```

Expected:

```text
FAIL because templates do not exist
```

- [ ] **Step 3: Create project structure template**

Create `templates/project-structure/generic.md`:

```markdown
# Project Structure

Generate only governance directories and Markdown rule files.

```text
.coding-rules/
docs/
  onboard/
  architecture/
  decisions/
  iterations/
  changelog.md
.quick-init/
  state/
  hooks/
```

Do not generate business source code, package metadata, language runtime configuration, or top-level `docs/verification/`, `docs/research/`, `docs/specs/`, or `docs/designs/`.
```

- [ ] **Step 4: Create coding rule templates**

Create `templates/coding-rules/generic.md`:

```markdown
# Generic Coding Rules

- Keep modules small and cohesive.
- Make behavior changes with focused tests.
- Prefer explicit contracts over implicit object shapes.
- Preserve unrelated user changes.
- Record unverified behavior as unverified.
```

Create `templates/coding-rules/documentation.md`:

```markdown
# Documentation Rules

- Keep durable project facts in `docs/architecture/`.
- Keep onboarding material in `docs/onboard/`.
- Keep decisions in `docs/decisions/`.
- Keep iteration records in `docs/iterations/`.
- Keep cross-iteration summaries in `docs/changelog.md`.
- Put verification evidence inside the relevant iteration document or plan.
```

Create `templates/coding-rules/git-workflow.md`:

```markdown
# Git Workflow Rules

- Use scoped staging.
- Preserve unrelated dirty work.
- Before commit or push, run the configured commit-governance flow.
- Do not bypass the Git pre-commit guard.
- If the guard blocks, resolve governance state before retrying commit.
```

Create language templates with one heading and concrete rules:

```markdown
# Python Coding Rules

- Use type hints for public functions.
- Prefer pathlib for filesystem paths.
- Keep side effects at command boundaries.
- Use pytest for repository tests.
```

```markdown
# Java Coding Rules

- Use `@author jijunling <jijunling@kuaishou.com>` in Java file headers.
- Keep package boundaries aligned with domain ownership.
- Prefer explicit null handling.
- Add focused tests for behavior changes.
```

```markdown
# TypeScript Coding Rules

- Prefer precise TypeScript types.
- Avoid ambient global state.
- Keep I/O at command or adapter boundaries.
- Add focused tests for behavior changes.
```

- [ ] **Step 5: Create docs templates**

Create `templates/docs/onboard.md`:

```markdown
# Onboard

Document project purpose, local setup, common commands, key directories, and known operational constraints.
```

Create `templates/docs/architecture.md`:

```markdown
# Architecture

Document durable architecture facts, module boundaries, external integrations, and constraints that should survive individual iterations.
```

Create `templates/docs/decision.md`:

```markdown
# Decisions

Record long-lived decisions with date, context, decision, consequences, and rollback notes.
```

Create `templates/docs/iteration.md`:

```markdown
# Iterations

Each iteration directory contains `iteration.md`, `manifest.json`, `specs/`, and `plans/`.
```

Create `templates/docs/changelog.md`:

```markdown
# Changelog

Cross-iteration summaries are managed through quick-init marker blocks. Manual notes belong outside quick-init marker blocks.
```

- [ ] **Step 6: Run template tests**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py -q
```

Expected:

```text
2 passed
```

- [ ] **Step 7: Commit task 3**

Run:

```bash
rtk git add -- templates tests/test_templates.py
rtk git diff --cached --check
rtk git commit -m "feat: add skill governance templates"
```

Expected:

```text
commit created
```

### Task 4: Add Commit Governance Core Rules

**Files:**
- Create: `templates/subagents/commit-governance-core.md`
- Create: `tests/test_rules.py`
- Create: `tests/test_slug_rules.py`

**Interfaces:**
- Consumes: template directory from Task 3.
- Produces: platform-neutral subagent instructions used by Codex and Claude adapters.

- [ ] **Step 1: Write rule coverage tests**

Create `tests/test_rules.py`:

```python
from __future__ import annotations

from conftest import read_text


def test_commit_governance_core_contains_classification_rules() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert "docs/iterations/**" in text
    assert "specs/" in text
    assert "plans/" in text
    assert "summarize-only" in text
    assert "unclear" in text


def test_commit_governance_core_contains_state_outputs() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert ".quick-init/state/last-governance-run.json" in text
    assert "docs/changelog.md" in text
    assert "manifest.json" in text
```

Create `tests/test_slug_rules.py`:

```python
from __future__ import annotations

from conftest import read_text


def test_slug_rules_are_explicit() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert "保留中文" in text
    assert "80" in text
    assert "-2" in text
    assert "YYYY-MM-DD-topic-slug" in text
```

- [ ] **Step 2: Run rule tests and observe failure**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_rules.py tests/test_slug_rules.py -q
```

Expected:

```text
FAIL because commit-governance core template does not exist
```

- [ ] **Step 3: Create commit-governance core template**

Create `templates/subagents/commit-governance-core.md`:

```markdown
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

## Output State

Write `.quick-init/state/last-governance-run.json` with:

```json
{
  "activeIteration": "YYYY-MM-DD-topic",
  "stagedDocsHash": "sha256",
  "manifestUpdated": true,
  "changelogSynced": true,
  "archivedAt": "ISO-8601 timestamp"
}
```

Return only a short summary to the main agent.
```

- [ ] **Step 4: Run rule tests**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_rules.py tests/test_slug_rules.py -q
```

Expected:

```text
3 passed
```

- [ ] **Step 5: Commit task 4**

Run:

```bash
rtk git add -- templates/subagents/commit-governance-core.md tests/test_rules.py tests/test_slug_rules.py
rtk git diff --cached --check
rtk git commit -m "feat: define commit governance rules"
```

Expected:

```text
commit created
```

### Task 5: Add Codex Adapter Templates

**Files:**
- Create: `templates/agent-integrations/codex/README.md`
- Create: `templates/agent-integrations/codex/hooks.json.tmpl`
- Create: `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl`
- Create: `templates/agent-integrations/codex/hooks/trigger.py.tmpl`
- Create: `tests/test_adapter_snapshots.py`
- Create: `tests/fixtures/snapshots/codex/hooks.json`
- Create: `tests/fixtures/snapshots/codex/agents/commit-governance.toml`

**Interfaces:**
- Consumes: `templates/subagents/commit-governance-core.md`.
- Produces: Codex integration templates and snapshot validation.

- [ ] **Step 1: Write Codex snapshot test**

Create `tests/test_adapter_snapshots.py`:

```python
from __future__ import annotations

import json
from pathlib import Path

from conftest import REPO_ROOT


def read(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_codex_hooks_template_matches_snapshot() -> None:
    rendered = read("templates/agent-integrations/codex/hooks.json.tmpl")
    expected = read("tests/fixtures/snapshots/codex/hooks.json")
    assert json.loads(rendered) == json.loads(expected)


def test_codex_agent_template_matches_snapshot() -> None:
    rendered = read("templates/agent-integrations/codex/agents/commit-governance.toml.tmpl")
    expected = read("tests/fixtures/snapshots/codex/agents/commit-governance.toml")
    assert rendered == expected
```

- [ ] **Step 2: Run Codex snapshot test and observe failure**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py -q
```

Expected:

```text
FAIL because adapter templates and snapshots do not exist
```

- [ ] **Step 3: Create Codex adapter README**

Create `templates/agent-integrations/codex/README.md`:

```markdown
# Codex Adapter

Install these generated files into the target repository:

- `.codex/hooks.json`
- `.codex/agents/commit-governance.toml`
- `.codex/hooks/commit-governance-trigger.py`

Before implementation, confirm the current Codex hook and subagent schema from:

- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/config-advanced
- https://developers.openai.com/codex/subagents

The trigger script must no-op when the staged docs hash matches `.quick-init/state/last-governance-run.json`.
```

- [ ] **Step 4: Create Codex hooks template and snapshot**

Create both `templates/agent-integrations/codex/hooks.json.tmpl` and `tests/fixtures/snapshots/codex/hooks.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/commit-governance-trigger.py user-prompt-submit"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/commit-governance-trigger.py pre-tool-use"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Create Codex agent template and snapshot**

Create both `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl` and `tests/fixtures/snapshots/codex/agents/commit-governance.toml`:

```toml
name = "commit-governance"
description = "Use when preparing git commits, pushes, publishing, finishing iterations, or synchronizing quick-init governance archives"
model = "low"

[permissions]
allow = [
  "read",
  "edit",
  "glob",
  "bash:git status",
  "bash:git diff",
  "bash:git add",
  "bash:git ls-files",
  "bash:git rev-parse",
  "bash:git hash-object"
]
deny = [
  "network",
  "bash:git push",
  "bash:git reset",
  "bash:git checkout",
  "bash:npm",
  "bash:pip"
]

[instructions]
file = "templates/subagents/commit-governance-core.md"
```

- [ ] **Step 6: Create Codex trigger template**

Create `templates/agent-integrations/codex/hooks/trigger.py.tmpl`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


def run_git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()


def staged_markdown_files() -> list[str]:
    output = run_git(["diff", "--cached", "--name-only"])
    return [line for line in output.splitlines() if line.endswith(".md")]


def staged_docs_hash(files: list[str]) -> str:
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.encode("utf-8"))
        try:
            content = subprocess.check_output(["git", "show", f":{path}"])
        except subprocess.CalledProcessError:
            content = b""
        digest.update(content)
    return digest.hexdigest()


def last_hash(root: Path) -> str | None:
    state = root / ".quick-init/state/last-governance-run.json"
    if not state.exists():
        return None
    data = json.loads(state.read_text(encoding="utf-8"))
    return data.get("stagedDocsHash")


def main() -> int:
    root = Path(run_git(["rev-parse", "--show-toplevel"]))
    files = staged_markdown_files()
    if not files:
        return 0
    current_hash = staged_docs_hash(files)
    if current_hash == last_hash(root):
        return 0
    trigger = root / ".quick-init/state/governance-trigger.json"
    trigger.parent.mkdir(parents=True, exist_ok=True)
    trigger.write_text(
        json.dumps(
            {
                "reason": sys.argv[1] if len(sys.argv) > 1 else "unknown",
                "stagedDocsHash": current_hash,
                "message": "Run commit-governance before continuing.",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("quick-init: commit-governance required before commit/push")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 7: Run Codex adapter tests**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py -q
```

Expected:

```text
2 passed
```

- [ ] **Step 8: Commit task 5**

Run:

```bash
rtk git add -- templates/agent-integrations/codex tests/test_adapter_snapshots.py tests/fixtures/snapshots/codex
rtk git diff --cached --check
rtk git commit -m "feat: add codex governance adapter"
```

Expected:

```text
commit created
```

### Task 6: Add Claude Adapter Templates

**Files:**
- Create: `templates/agent-integrations/claude/README.md`
- Create: `templates/agent-integrations/claude/settings.json.tmpl`
- Create: `templates/agent-integrations/claude/agents/commit-governance.md.tmpl`
- Create: `templates/agent-integrations/claude/hooks/trigger.sh.tmpl`
- Modify: `tests/test_adapter_snapshots.py`
- Create: `tests/fixtures/snapshots/claude/settings.json`
- Create: `tests/fixtures/snapshots/claude/agents/commit-governance.md`

**Interfaces:**
- Consumes: `templates/subagents/commit-governance-core.md`.
- Produces: Claude integration templates and snapshot validation.

- [ ] **Step 1: Extend adapter snapshot tests**

Modify `tests/test_adapter_snapshots.py` to include:

```python
def test_claude_settings_template_matches_snapshot() -> None:
    rendered = read("templates/agent-integrations/claude/settings.json.tmpl")
    expected = read("tests/fixtures/snapshots/claude/settings.json")
    assert json.loads(rendered) == json.loads(expected)


def test_claude_agent_template_matches_snapshot() -> None:
    rendered = read("templates/agent-integrations/claude/agents/commit-governance.md.tmpl")
    expected = read("tests/fixtures/snapshots/claude/agents/commit-governance.md")
    assert rendered == expected
```

- [ ] **Step 2: Run Claude snapshot tests and observe failure**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py -q
```

Expected:

```text
FAIL because Claude adapter templates and snapshots do not exist
```

- [ ] **Step 3: Create Claude adapter README**

Create `templates/agent-integrations/claude/README.md`:

```markdown
# Claude Adapter

Install these generated files into the target repository:

- `.claude/settings.json`
- `.claude/agents/commit-governance.md`
- `.claude/hooks/commit-governance-trigger.sh`

Before implementation, confirm the current Claude Code hook and subagent schema from:

- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/sub-agents
```

- [ ] **Step 4: Create Claude settings template and snapshot**

Create both `templates/agent-integrations/claude/settings.json.tmpl` and `tests/fixtures/snapshots/claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/commit-governance-trigger.sh user-prompt-submit"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/commit-governance-trigger.sh pre-tool-use"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Create Claude agent template and snapshot**

Create both `templates/agent-integrations/claude/agents/commit-governance.md.tmpl` and `tests/fixtures/snapshots/claude/agents/commit-governance.md`:

```markdown
---
name: commit-governance
description: Use when preparing git commits, pushes, publishing, finishing iterations, or synchronizing quick-init governance archives
tools:
  - Read
  - Edit
  - Glob
  - Bash
model: haiku
---

# Commit Governance

Use `templates/subagents/commit-governance-core.md` as the authoritative task contract.

Allowed Bash commands:

- `git status`
- `git diff`
- `git add`
- `git ls-files`
- `git rev-parse`
- `git hash-object`

Forbidden Bash commands:

- `git push`
- `git reset`
- `git checkout`
- `npm`
- `pip`
- destructive shell commands
```

- [ ] **Step 6: Create Claude trigger wrapper**

Create `templates/agent-integrations/claude/hooks/trigger.sh.tmpl`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
exec python3 "$ROOT/.quick-init/hooks/agent-trigger.py" "${1:-unknown}"
```

- [ ] **Step 7: Run adapter snapshot tests**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py -q
```

Expected:

```text
4 passed
```

- [ ] **Step 8: Commit task 6**

Run:

```bash
rtk git add -- templates/agent-integrations/claude tests/test_adapter_snapshots.py tests/fixtures/snapshots/claude
rtk git diff --cached --check
rtk git commit -m "feat: add claude governance adapter"
```

Expected:

```text
commit created
```

### Task 7: Add Git Guard Template And Tests

**Files:**
- Create: `templates/hooks/git-pre-commit-guard.py.tmpl`
- Create: `tests/test_guard_script.py`

**Interfaces:**
- Consumes: expected state file `.quick-init/state/last-governance-run.json`.
- Produces: Python guard script template for target Git pre-commit hook.

- [ ] **Step 1: Write guard behavior tests**

Create `tests/test_guard_script.py`:

```python
from __future__ import annotations

from conftest import read_text


def test_guard_template_mentions_required_checks() -> None:
    text = read_text("templates/hooks/git-pre-commit-guard.py.tmpl")
    assert ".quick-init/state/last-governance-run.json" in text
    assert "docs/changelog.md" in text
    assert "stagedDocsHash" in text
    assert "docs/iterations" in text


def test_guard_template_cleans_old_quick_init_hook_block() -> None:
    text = read_text("templates/hooks/git-pre-commit-guard.py.tmpl")
    assert "quick-init archive --staged" in text
```

- [ ] **Step 2: Run guard tests and observe failure**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_guard_script.py -q
```

Expected:

```text
FAIL because guard template does not exist
```

- [ ] **Step 3: Create guard template**

Create `templates/hooks/git-pre-commit-guard.py.tmpl`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


OLD_COMMAND = "quick-init archive --staged"


def git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()


def staged_markdown_files() -> list[str]:
    output = git(["diff", "--cached", "--name-only"])
    return [line for line in output.splitlines() if line.endswith(".md")]


def staged_docs_hash(files: list[str]) -> str:
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.encode("utf-8"))
        try:
            digest.update(subprocess.check_output(["git", "show", f":{path}"]))
        except subprocess.CalledProcessError:
            digest.update(b"")
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    if not path.exists():
        raise RuntimeError(f"missing required state file: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    root = Path(git(["rev-parse", "--show-toplevel"]))
    files = staged_markdown_files()
    if not files:
        return 0

    state = load_json(root / ".quick-init/state/last-governance-run.json")
    current_hash = staged_docs_hash(files)
    if state.get("stagedDocsHash") != current_hash:
        print("quick-init: commit-governance state is stale", file=sys.stderr)
        return 1

    active_iteration = state.get("activeIteration")
    if not active_iteration:
        print("quick-init: missing activeIteration in governance state", file=sys.stderr)
        return 1

    iteration_dir = root / "docs/iterations" / active_iteration
    for required in ["iteration.md", "manifest.json"]:
        if not (iteration_dir / required).exists():
            print(f"quick-init: missing {iteration_dir / required}", file=sys.stderr)
            return 1

    changelog = root / "docs/changelog.md"
    if not changelog.exists():
        print("quick-init: missing docs/changelog.md", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run guard tests**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_guard_script.py -q
```

Expected:

```text
2 passed
```

- [ ] **Step 5: Commit task 7**

Run:

```bash
rtk git add -- templates/hooks/git-pre-commit-guard.py.tmpl tests/test_guard_script.py
rtk git diff --cached --check
rtk git commit -m "feat: add git governance guard template"
```

Expected:

```text
commit created
```

### Task 8: Add Development Documentation For Skill Init Flow

**Files:**
- Modify: `SKILL.md`
- Modify: `README.md`
- Create: `tests/test_skill_flow.py`

**Interfaces:**
- Consumes: all templates and adapter paths.
- Produces: complete Skill init flow instructions that future agents can execute.

- [ ] **Step 1: Write Skill flow tests**

Create `tests/test_skill_flow.py`:

```python
from __future__ import annotations

from conftest import read_text


def test_skill_flow_names_required_questions() -> None:
    text = read_text("SKILL.md")
    for phrase in [
        "project name",
        "one-sentence project goal",
        "primary language",
        "Codex",
        "Claude",
        "first iteration name",
    ]:
        assert phrase in text


def test_skill_flow_requires_seed_iteration_before_guard() -> None:
    text = read_text("SKILL.md")
    assert "seed iteration" in text
    assert "before installing the Git pre-commit guard" in text
```

- [ ] **Step 2: Run Skill flow tests and observe failure**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_skill_flow.py -q
```

Expected:

```text
FAIL until SKILL.md contains exact flow language
```

- [ ] **Step 3: Expand SKILL.md Required Flow**

Modify `SKILL.md` so its required flow contains these exact lines:

```markdown
Ask for project name.
Ask for one-sentence project goal.
Ask for primary language.
Ask whether to install Codex, Claude, or both.
Ask for first iteration name.
Create the seed iteration before installing the Git pre-commit guard.
```

- [ ] **Step 4: Update README development section**

Modify `README.md` development section:

```markdown
## Development Checks

```bash
/opt/anaconda3/envs/py311env/bin/python -m pytest
```

Implementation work must keep the repository free of Node, npm, TypeScript, Vitest, old CLI entrypoints, and old generated docs directories.
```

- [ ] **Step 5: Run full pytest suite**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest -q
```

Expected:

```text
all tests pass
```

- [ ] **Step 6: Commit task 8**

Run:

```bash
rtk git add -- README.md SKILL.md tests/test_skill_flow.py
rtk git diff --cached --check
rtk git commit -m "docs: define skill init flow"
```

Expected:

```text
commit created
```

### Task 9: Final Verification And Manual Skill Scenario Record

**Files:**
- Create: `docs/iterations/2026-06-29-skill-only-quick-init-implementation/iteration.md`
- Create: `docs/iterations/2026-06-29-skill-only-quick-init-implementation/manifest.json`

**Interfaces:**
- Consumes: completed template repository.
- Produces: human-readable e2e verification record for this implementation.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
rtk /opt/anaconda3/envs/py311env/bin/python -m pytest -q
rtk rg -n "quick-init init|quick-init archive|quick-init iteration|npm link|npm install|vitest|tsconfig|package.json" README.md SKILL.md templates tests docs/superpowers/specs/2026-06-29-skill-only-quick-init-design.md
rtk git status --short --branch
```

Expected:

```text
pytest passes
rg only reports old command strings in historical design cleanup sections when intentionally referenced
git status contains only intended changed files
```

- [ ] **Step 2: Run pressure scenario manually**

In a temporary repository, invoke the Skill instructions by hand:

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"
git init
```

Use the new `SKILL.md` flow with:

```text
project name: sample-governed-project
project goal: test quick-init skill-only governance
primary language: python
agent integrations: Codex and Claude
first iteration: 初始化项目治理
```

Expected generated structure:

```text
.coding-rules/
.codex/hooks.json
.codex/agents/commit-governance.toml
.claude/settings.json
.claude/agents/commit-governance.md
docs/onboard/README.md
docs/architecture/README.md
docs/decisions/README.md
docs/iterations/2026-06-29-初始化项目治理/iteration.md
docs/iterations/2026-06-29-初始化项目治理/manifest.json
docs/changelog.md
.quick-init/hooks/pre-commit-guard.py
```

- [ ] **Step 3: Record verification**

Create `docs/iterations/2026-06-29-skill-only-quick-init-implementation/iteration.md`:

```markdown
# Skill-only quick-init implementation verification

## Summary

Implemented the Skill-only quick-init template repository and removed the legacy CLI surface.

## Automated Verification

- `/opt/anaconda3/envs/py311env/bin/python -m pytest -q`: pass
- `git diff --cached --check`: pass

## Manual Scenario

Initialized a temporary repository with Python, Codex, Claude, and first iteration `初始化项目治理`.

## Result

Generated governance-only structure with no npm, Node, TypeScript CLI, business code, top-level docs/specs, docs/designs, docs/verification, or docs/research.
```

Create `docs/iterations/2026-06-29-skill-only-quick-init-implementation/manifest.json`:

```json
{
  "iteration": "2026-06-29-skill-only-quick-init-implementation",
  "status": "active",
  "changelogSynced": false,
  "documents": [
    {
      "path": "docs/iterations/2026-06-29-skill-only-quick-init-implementation/iteration.md",
      "category": "plans",
      "action": "archive"
    }
  ],
  "createdBy": "manual-verification"
}
```

- [ ] **Step 4: Commit task 9**

Run:

```bash
rtk git add -- docs/iterations
rtk git diff --cached --check
rtk git commit -m "docs: record skill-only verification"
```

Expected:

```text
commit created
```

- [ ] **Step 5: Final status**

Run:

```bash
rtk git status --short --branch
rtk git log --oneline -5
```

Expected:

```text
branch is ahead by implementation commits
only unrelated ignored or intentionally untracked files remain
```

## Self-Review Checklist

- Spec P0: old CLI relationship is implemented by deletion, not compatibility.
- Spec P0: Skill installation and template access are represented in README and SKILL.
- Spec P0: Codex/Claude trigger chain is represented in adapter templates.
- Spec P1: existing Git pre-commit is preserved by marker block strategy and old block cleanup requirement.
- Spec P1: seed iteration is created before Git guard installation.
- Spec P1: template structure uses `.tmpl` for generated JSON/TOML/script targets.
- Spec P1: specs/plans classification rules are explicit in commit-governance core.
- Spec P1: Python + pytest test runtime is fixed.
- Spec P2: UserPromptSubmit and PreToolUse duplicate runs are short-circuited by staged docs hash.
- Spec P2: subagent permissions are documented for Codex and Claude.
- No task keeps a legacy CLI path.
