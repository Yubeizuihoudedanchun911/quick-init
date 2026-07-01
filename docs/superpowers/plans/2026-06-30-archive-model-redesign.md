# Archive Model Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the target project archive model: replace the heavy pre-commit guard + hash-compare + intent-recognition pipeline with a dual-frequency model (daily per-commit + summarize on iteration close), add ADR auto-extraction, and simplify iteration structure to flat layout.

**Architecture:** The commit-governance sub-agent prompt splits into three files (core, daily, summarize) loaded by mode. The trigger script becomes a thin shell that only starts the sub-agent on PreToolUse. UserPromptSubmit hooks, pre-commit guard, hash comparison, intent keywords, and finalize script are all removed.

**Tech Stack:** Python 3 + pytest for tests. Markdown templates. Codex TOML and Claude MD agent configs. Shell trigger wrapper for Claude.

## Global Constraints

- No npm, Node.js, TypeScript, or Vitest.
- Test runner: `/opt/anaconda3/envs/py311env/bin/python -m pytest`
- `.quick-init/` must be in `.gitignore`, never committed.
- All template paths are relative to the SKILL root.
- Codex adapter follows `.codex/` conventions; Claude adapter follows `.claude/` conventions.
- Existing coding-rules, agent-instruction, and design-principles templates are NOT modified by this plan.

---

## File Structure

### Files to Create

- `templates/subagents/commit-governance-daily.md` — high-frequency prompt: scatter-doc archiving + changelog
- `templates/subagents/commit-governance-summarize.md` — low-frequency prompt: ADR extraction + global doc update + iteration close
- `templates/docs/adr.md` — ADR template
- `templates/agent-integrations/codex/agents/commit-governance-summarize.toml.tmpl` — Codex summarize agent config
- `templates/agent-integrations/claude/agents/commit-governance-summarize.md.tmpl` — Claude summarize agent config
- `tests/test_daily_prompt.py` — daily prompt content tests
- `tests/test_summarize_prompt.py` — summarize prompt content tests
- `tests/test_adr_template.py` — ADR template format tests
- `tests/fixtures/snapshots/codex/agents/commit-governance-summarize.toml` — Codex summarize snapshot
- `tests/fixtures/snapshots/claude/agents/commit-governance-summarize.md` — Claude summarize snapshot
- `tests/fixtures/snapshots/claude/settings-pretooluse-only.json` — Claude settings snapshot (PreToolUse only)

### Files to Modify

- `templates/subagents/commit-governance-core.md` — strip to shared-only content
- `templates/docs/decision.md` — replace with ADR index (rename to decisions README role)
- `templates/docs/iteration.md` — simplify to flat-doc structure
- `templates/docs/changelog.md` — remove marker-block mention
- `templates/agent-integrations/claude/settings.json.tmpl` — remove UserPromptSubmit, keep PreToolUse only
- `templates/agent-integrations/claude/agents/commit-governance.md.tmpl` — reference core + daily, remove finalize
- `templates/agent-integrations/claude/hooks/trigger.sh.tmpl` — simplify to thin shell
- `templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl` — rewrite as thin launcher (no core import)
- `templates/agent-integrations/codex/hooks.json.tmpl` — remove UserPromptSubmit, keep PreToolUse only
- `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl` — reference core + daily, remove finalize
- `templates/agent-integrations/codex/hooks/trigger.py.tmpl` — rewrite as thin launcher (no core import)
- `SKILL.md` — update Required Flow (remove guard/finalize steps, add summarize agent step)
- `tests/test_templates.py` — update REQUIRED_TEMPLATES, skeleton sections, add adr.md
- `tests/test_rules.py` — rewrite for core + daily + summarize structure
- `tests/test_adapter_snapshots.py` — rewrite for new adapter structure
- `tests/test_skill_flow.py` — update Required Flow assertions (no guard, no finalize)
- `tests/fixtures/snapshots/claude/settings.json` — update to PreToolUse-only
- `tests/fixtures/snapshots/claude/agents/commit-governance.md` — update to core + daily reference
- `tests/fixtures/snapshots/codex/agents/commit-governance.toml` — update to core + daily reference
- `tests/fixtures/snapshots/codex/hooks.json` — update to PreToolUse-only

### Files to Delete

- `templates/hooks/governance-trigger-core.py.tmpl`
- `templates/hooks/finalize-governance.py.tmpl`
- `templates/hooks/intent-keywords.json`
- `templates/hooks/git-pre-commit-guard.py.tmpl`
- `tests/test_finalize_governance.py`
- `tests/test_guard_script.py`

---

### Task 1: Delete Obsolete Templates and Tests

**Files:**
- Delete: `templates/hooks/governance-trigger-core.py.tmpl`
- Delete: `templates/hooks/finalize-governance.py.tmpl`
- Delete: `templates/hooks/intent-keywords.json`
- Delete: `templates/hooks/git-pre-commit-guard.py.tmpl`
- Delete: `tests/test_finalize_governance.py`
- Delete: `tests/test_guard_script.py`
- Modify: `tests/test_templates.py`

**Interfaces:**
- Consumes: nothing
- Produces: clean template and test tree without guard/finalize/intent-keywords references

- [ ] **Step 1: Write the failing test — verify obsolete files do not exist**

```python
# tests/test_templates.py — add at the end of the file

def test_obsolete_hook_templates_removed() -> None:
    for path in [
        "templates/hooks/governance-trigger-core.py.tmpl",
        "templates/hooks/finalize-governance.py.tmpl",
        "templates/hooks/intent-keywords.json",
        "templates/hooks/git-pre-commit-guard.py.tmpl",
    ]:
        assert not (REPO_ROOT / path).exists(), f"{path} must be deleted"


def test_obsolete_test_files_removed() -> None:
    for path in [
        "tests/test_finalize_governance.py",
        "tests/test_guard_script.py",
    ]:
        assert not (REPO_ROOT / path).exists(), f"{path} must be deleted"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py::test_obsolete_hook_templates_removed tests/test_templates.py::test_obsolete_test_files_removed -v`
Expected: FAIL — files still exist

- [ ] **Step 3: Delete the obsolete files**

```bash
rm templates/hooks/governance-trigger-core.py.tmpl
rm templates/hooks/finalize-governance.py.tmpl
rm templates/hooks/intent-keywords.json
rm templates/hooks/git-pre-commit-guard.py.tmpl
rm tests/test_finalize_governance.py
rm tests/test_guard_script.py
```

- [ ] **Step 4: Remove tests that reference deleted files**

Remove these functions from `tests/test_templates.py`:
- `test_governance_trigger_core_template_exists`
- `test_intent_keywords_json_is_valid`

- [ ] **Step 5: Run tests to verify deletion tests pass**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py -v`
Expected: PASS for `test_obsolete_hook_templates_removed` and `test_obsolete_test_files_removed`. Other tests may still fail (will be fixed in later tasks).

- [ ] **Step 6: Commit**

```bash
git add templates/hooks/ tests/test_finalize_governance.py tests/test_guard_script.py tests/test_templates.py
git commit -m "refactor: delete obsolete guard, finalize, and intent-keywords templates and tests"
```

---

### Task 2: Rewrite commit-governance-core.md and Create daily/summarize Prompts

**Files:**
- Modify: `templates/subagents/commit-governance-core.md`
- Create: `templates/subagents/commit-governance-daily.md`
- Create: `templates/subagents/commit-governance-summarize.md`
- Create: `tests/test_daily_prompt.py`
- Create: `tests/test_summarize_prompt.py`
- Modify: `tests/test_rules.py`

**Interfaces:**
- Consumes: nothing
- Produces: three prompt files referenced by adapter templates in Task 4. `commit-governance-core.md` contains shared rules, `commit-governance-daily.md` contains archive+changelog rules, `commit-governance-summarize.md` contains ADR+global-doc+close rules.

- [ ] **Step 1: Write failing tests for the three prompt files**

Replace `tests/test_rules.py` entirely:

```python
from __future__ import annotations

from conftest import read_text


def test_core_prompt_contains_shared_rules() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert "docs/" in text
    assert ".quick-init/" in text
    assert "manifest.json" in text
    assert "iteration" in text.lower()
    assert "slug" in text.lower()


def test_core_prompt_does_not_contain_mode_specific_content() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert "changelog" not in text.lower()
    assert "adr" not in text.lower()
    assert "architecture" not in text.lower()
    assert "onboard" not in text.lower()
    assert "last-governance-run" not in text
    assert "finalize-governance" not in text
    assert "stagedDocsHash" not in text


def test_daily_prompt_exists_and_contains_archive_rules() -> None:
    text = read_text("templates/subagents/commit-governance-daily.md")
    assert "staged" in text.lower()
    assert "changelog" in text.lower()
    assert "unclassified" in text.lower()
    assert "docs/iterations/" in text


def test_daily_prompt_does_not_contain_summarize_content() -> None:
    text = read_text("templates/subagents/commit-governance-daily.md")
    assert "adr" not in text.lower()
    assert "decision" not in text.lower()
    assert "architecture" not in text.lower()
    assert "onboard" not in text.lower()


def test_summarize_prompt_exists_and_contains_adr_rules() -> None:
    text = read_text("templates/subagents/commit-governance-summarize.md")
    assert "decision" in text.lower() or "adr" in text.lower()
    assert "architecture" in text.lower()
    assert "onboard" in text.lower()
    assert "closed" in text.lower()


def test_summarize_prompt_does_not_contain_daily_content() -> None:
    text = read_text("templates/subagents/commit-governance-summarize.md")
    assert "unclassified" not in text.lower()
```

Create `tests/test_daily_prompt.py`:

```python
from __future__ import annotations

from conftest import read_text


def test_daily_prompt_has_heading() -> None:
    text = read_text("templates/subagents/commit-governance-daily.md")
    assert text.startswith("# ")


def test_daily_prompt_mentions_no_blocking() -> None:
    text = read_text("templates/subagents/commit-governance-daily.md")
    lower = text.lower()
    assert "not block" in lower or "do not block" in lower or "不阻塞" in text


def test_daily_prompt_mentions_flat_layout() -> None:
    text = read_text("templates/subagents/commit-governance-daily.md")
    lower = text.lower()
    assert "flat" in lower or "扁平" in text


def test_daily_prompt_mentions_changelog_format() -> None:
    text = read_text("templates/subagents/commit-governance-daily.md")
    assert "**<type>**" in text or "feat" in text.lower()
```

Create `tests/test_summarize_prompt.py`:

```python
from __future__ import annotations

from conftest import read_text


def test_summarize_prompt_has_heading() -> None:
    text = read_text("templates/subagents/commit-governance-summarize.md")
    assert text.startswith("# ")


def test_summarize_prompt_mentions_adr_template() -> None:
    text = read_text("templates/subagents/commit-governance-summarize.md")
    assert "ADR-" in text or "adr" in text.lower()
    assert "Context" in text
    assert "Consequences" in text


def test_summarize_prompt_mentions_decision_types() -> None:
    text = read_text("templates/subagents/commit-governance-summarize.md")
    lower = text.lower()
    for signal in ["migration", "迁移", "replace", "替换", "废弃", "deprecat"]:
        if signal in lower:
            return
    assert False, "Must mention at least one decision signal type"


def test_summarize_prompt_mentions_iteration_close() -> None:
    text = read_text("templates/subagents/commit-governance-summarize.md")
    assert "closed" in text.lower() or "close" in text.lower()
    assert "manifest" in text.lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_rules.py tests/test_daily_prompt.py tests/test_summarize_prompt.py -v`
Expected: FAIL — daily and summarize files don't exist, core still has old content

- [ ] **Step 3: Rewrite commit-governance-core.md**

Replace `templates/subagents/commit-governance-core.md` with:

```markdown
# Commit Governance Core

## Purpose

Shared rules for all commit-governance modes. Each mode loads this file plus its own mode-specific prompt.

## Allowed Writes

- `docs/iterations/**`
- `docs/decisions/**`
- `docs/changelog.md`
- `docs/architecture/**`
- `docs/onboard/**`
- `.quick-init/state/active-iteration.json`

## Disallowed Writes

- Business source code
- Test files
- Dependency files (package.json, pyproject.toml, etc.)
- Runtime configuration outside selected agent integration files
- Destructive git operations (push, reset, checkout, rebase)

## Iteration Directory

```text
docs/iterations/YYYY-MM-DD-<topic-slug>/
  iteration.md
  manifest.json
  <archived documents — flat, no subdirectories>
```

Slug rules:

- Preserve Chinese characters, English letters, numbers, hyphens, and underscores.
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
```

- [ ] **Step 4: Create commit-governance-daily.md**

Create `templates/subagents/commit-governance-daily.md`:

```markdown
# Commit Governance — Daily Mode

Triggered on every `git commit` / `git push` via PreToolUse hook. Runs silently; does not block the commit.

## Scatter-Doc Archiving

Scan staged files and identify process documents (spec, design, plan, research, technical investigation, PRD, user story, comparison, verification report, etc.) regardless of which tool generated them or where they live.

Move identified documents into the current iteration directory with a flat layout (no subdirectories).

### Do Not Archive

- Files already in `docs/iterations/`
- Files in `docs/decisions/`
- Global docs: `docs/onboard/`, `docs/architecture/`
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
```

- [ ] **Step 5: Create commit-governance-summarize.md**

Create `templates/subagents/commit-governance-summarize.md`:

```markdown
# Commit Governance — Summarize Mode

Triggered when the developer explicitly requests to close the current iteration.

## Decision Extraction

Review all archived documents and changelog records for the current iteration. Identify major decisions:

| Decision Type | Typical Signals |
|--------------|----------------|
| Tech stack change | "migrate from X to Y", "replace Z", "deprecate W", "从 X 迁移到 Y", "替换 Z", "废弃 W" |
| Architecture restructure | "split module", "merge service", "change API contract", "拆分模块", "合并服务" |
| Process change | "switch from CLI to Skill", "test framework from Vitest to pytest", "工具链切换" |
| Approach selection | Document compares 2-3 approaches and selects one |

For each decision, generate an ADR draft to `docs/decisions/NNNN-<slug>.md`:

```markdown
# ADR-NNNN: <title>

日期：YYYY-MM-DD
状态：accepted
iteration：<iteration name>

## Context

Why was this decision needed? What problem or constraint existed?

## Decision

What approach was chosen?

## Alternatives Considered

Approaches that were considered but rejected, and why.

## Consequences

Positive and negative impacts of this decision.

## Rollback

How to reverse this decision. How costly would it be?
```

### ADR Constraints

- Do not fabricate decision motivations. If the source documents do not explain why, write "未在原文档中说明，需补充" in the Context section.
- A single iteration may produce zero or more ADRs.
- ADR numbering auto-increments from existing files in `docs/decisions/`.

## Global Document Updates

- `docs/architecture/README.md`: update affected sections if module boundaries, data flow, or external integrations changed during this iteration.
- `docs/onboard/README.md`: update if new commands, environment requirements, or development entry points were introduced.
- `docs/decisions/README.md`: append new ADRs to the index table.

## Close Iteration

1. Generate or update `iteration.md` with execution summary and outstanding issues.
2. Set `manifest.json` `"status": "closed"`.
3. Add an iteration-level section heading in `docs/changelog.md`.
4. Stage all changes with `git add`.
5. Return a summary to the main agent.
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_rules.py tests/test_daily_prompt.py tests/test_summarize_prompt.py -v`
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add templates/subagents/ tests/test_rules.py tests/test_daily_prompt.py tests/test_summarize_prompt.py
git commit -m "feat: split commit-governance into core/daily/summarize prompts"
```

---

### Task 3: Update Docs Templates (decision, iteration, changelog, ADR)

**Files:**
- Modify: `templates/docs/decision.md`
- Modify: `templates/docs/iteration.md`
- Modify: `templates/docs/changelog.md`
- Create: `templates/docs/adr.md`
- Create: `tests/test_adr_template.py`
- Modify: `tests/test_templates.py`

**Interfaces:**
- Consumes: nothing
- Produces: updated docs templates used by SKILL.md init flow

- [ ] **Step 1: Write failing tests**

Create `tests/test_adr_template.py`:

```python
from __future__ import annotations

from conftest import REPO_ROOT, read_text


def test_adr_template_exists() -> None:
    assert (REPO_ROOT / "templates/docs/adr.md").exists()


def test_adr_template_has_required_sections() -> None:
    text = read_text("templates/docs/adr.md")
    for section in ["Context", "Decision", "Alternatives Considered", "Consequences", "Rollback"]:
        assert f"## {section}" in text


def test_adr_template_has_frontmatter_placeholders() -> None:
    text = read_text("templates/docs/adr.md")
    assert "ADR-NNNN" in text
    assert "YYYY-MM-DD" in text
    assert "iteration" in text.lower()
```

Update `tests/test_templates.py` — modify `REQUIRED_TEMPLATES` list and `_DOCS_SKELETON_SECTIONS`:

Add `"templates/docs/adr.md"` to `REQUIRED_TEMPLATES`.

Replace the `_DOCS_SKELETON_SECTIONS` entry for `"templates/docs/decision.md"` from `["Record format"]` to `["ADR", "索引"]` (or similar, matching new content).

Replace the `_DOCS_SKELETON_SECTIONS` entry for `"templates/docs/iteration.md"` from `["Creating a New Iteration", "Closing an Iteration"]` to `["归档文档", "执行摘要", "遗留问题"]`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adr_template.py tests/test_templates.py::test_docs_templates_have_skeleton_sections -v`
Expected: FAIL — adr.md doesn't exist, decision.md and iteration.md have old content

- [ ] **Step 3: Create ADR template**

Create `templates/docs/adr.md`:

```markdown
# ADR-NNNN: <决策标题>

日期：YYYY-MM-DD
状态：accepted
iteration：<关联的 iteration 名称>

## Context

为什么需要做这个决策？当时面临什么问题或约束？

## Decision

选择了什么方案？

## Alternatives Considered

考虑过但放弃的方案及原因。

## Consequences

这个决策带来的正面和负面影响。

## Rollback

如果需要回撤，怎么做？代价多大？
```

- [ ] **Step 4: Update decision.md to ADR index**

Replace `templates/docs/decision.md` with:

```markdown
# Decisions

记录影响项目架构和流程的重大决策。ADR 由 commit-governance 在 iteration 结束时自动生成草稿。

## 索引

| # | 决策 | 日期 | Iteration | 状态 |
|---|------|------|-----------|------|
```

- [ ] **Step 5: Update iteration.md template**

Replace `templates/docs/iteration.md` with:

```markdown
# Iterations

每个 iteration 目录包含 `iteration.md`、`manifest.json` 和归档文档（扁平放置）。

## 归档文档

| 文件 | 类别 | 来源 |
|------|------|------|

## 执行摘要

## 遗留问题
```

- [ ] **Step 6: Update changelog.md template**

Replace `templates/docs/changelog.md` with:

```markdown
# Changelog

每次提交自动追加一行记录。Iteration 结束时补充分隔标题。
```

- [ ] **Step 7: Update test_templates.py**

In `REQUIRED_TEMPLATES`, add `"templates/docs/adr.md"`.

In `_DOCS_SKELETON_SECTIONS`, update:
```python
_DOCS_SKELETON_SECTIONS = {
    "templates/docs/onboard.md": ["Project Purpose", "Local Setup", "Common Commands"],
    "templates/docs/architecture.md": ["Module Boundaries", "External Integrations", "Data Flow"],
    "templates/docs/decision.md": ["ADR", "索引"],
    "templates/docs/iteration.md": ["归档文档", "执行摘要", "遗留问题"],
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adr_template.py tests/test_templates.py -v`
Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add templates/docs/ tests/test_adr_template.py tests/test_templates.py
git commit -m "feat: add ADR template and update decision/iteration/changelog templates"
```

---

### Task 4: Rewrite Adapter Templates (Claude + Codex)

**Files:**
- Modify: `templates/agent-integrations/claude/settings.json.tmpl`
- Modify: `templates/agent-integrations/claude/agents/commit-governance.md.tmpl`
- Create: `templates/agent-integrations/claude/agents/commit-governance-summarize.md.tmpl`
- Modify: `templates/agent-integrations/claude/hooks/trigger.sh.tmpl`
- Modify: `templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl`
- Modify: `templates/agent-integrations/codex/hooks.json.tmpl`
- Modify: `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl`
- Create: `templates/agent-integrations/codex/agents/commit-governance-summarize.toml.tmpl`
- Modify: `templates/agent-integrations/codex/hooks/trigger.py.tmpl`
- Modify: `tests/test_adapter_snapshots.py`
- Update: all snapshot fixtures

**Interfaces:**
- Consumes: `commit-governance-core.md`, `commit-governance-daily.md`, `commit-governance-summarize.md` from Task 2
- Produces: adapter templates and trigger scripts that reference the new prompt structure

- [ ] **Step 1: Write failing tests for new adapter structure**

Replace `tests/test_adapter_snapshots.py` entirely:

```python
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from conftest import REPO_ROOT, read_text


def test_codex_hooks_pretooluse_only() -> None:
    rendered = json.loads(read_text("templates/agent-integrations/codex/hooks.json.tmpl"))
    assert "PreToolUse" in rendered["hooks"]
    assert "UserPromptSubmit" not in rendered["hooks"]


def test_codex_daily_agent_references_core_and_daily() -> None:
    text = read_text("templates/agent-integrations/codex/agents/commit-governance.toml.tmpl")
    assert "commit-governance-core.md" in text
    assert "commit-governance-daily.md" in text
    assert "finalize-governance" not in text


def test_codex_summarize_agent_exists_and_references_core_and_summarize() -> None:
    text = read_text(
        "templates/agent-integrations/codex/agents/commit-governance-summarize.toml.tmpl"
    )
    assert "commit-governance-core.md" in text
    assert "commit-governance-summarize.md" in text
    assert "finalize-governance" not in text


def test_codex_trigger_is_thin_launcher() -> None:
    text = read_text("templates/agent-integrations/codex/hooks/trigger.py.tmpl")
    assert "governance_trigger_core" not in text
    assert "process_event" not in text
    assert "staged_docs_hash" not in text
    assert "intent" not in text.lower()


def test_claude_settings_pretooluse_only() -> None:
    rendered = json.loads(
        read_text("templates/agent-integrations/claude/settings.json.tmpl")
    )
    assert "PreToolUse" in rendered["hooks"]
    assert "UserPromptSubmit" not in rendered["hooks"]


def test_claude_daily_agent_references_core_and_daily() -> None:
    text = read_text(
        "templates/agent-integrations/claude/agents/commit-governance.md.tmpl"
    )
    assert "commit-governance-core.md" in text
    assert "commit-governance-daily.md" in text
    assert "finalize-governance" not in text


def test_claude_summarize_agent_exists_and_references_core_and_summarize() -> None:
    text = read_text(
        "templates/agent-integrations/claude/agents/commit-governance-summarize.md.tmpl"
    )
    assert "commit-governance-core.md" in text
    assert "commit-governance-summarize.md" in text
    assert "finalize-governance" not in text


def test_claude_trigger_sh_is_thin_shell() -> None:
    text = read_text("templates/agent-integrations/claude/hooks/trigger.sh.tmpl")
    assert "python3" in text
    assert "agent-trigger.py" in text
    assert "intent" not in text.lower()


def test_claude_agent_trigger_is_thin_launcher() -> None:
    text = read_text("templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl")
    assert "governance_trigger_core" not in text
    assert "process_event" not in text
    assert "staged_docs_hash" not in text
    assert "intent" not in text.lower()


def test_claude_trigger_wrapper_invocation(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True)

    hook_dir = repo_root / ".claude" / "hooks"
    trigger_path = hook_dir / "commit-governance-trigger.sh"
    hook_dir.mkdir(parents=True, exist_ok=True)
    trigger_path.write_text(
        read_text("templates/agent-integrations/claude/hooks/trigger.sh.tmpl"),
        encoding="utf-8",
    )

    quick_init_hook_dir = repo_root / ".quick-init" / "hooks"
    quick_init_hook_dir.mkdir(parents=True, exist_ok=True)
    (quick_init_hook_dir / "agent-trigger.py").write_text(
        "\n".join(
            [
                "import json, sys",
                "payload = json.loads(sys.stdin.read())",
                'print(json.dumps({"received": True, "event": payload.get("hook_event_name", "")}))',
            ]
        ),
        encoding="utf-8",
    )

    payload = json.dumps({"hook_event_name": "PreToolUse", "cwd": str(repo_root)})
    completed = subprocess.run(
        ["bash", str(trigger_path), "pre-tool-use"],
        input=payload,
        env={**os.environ, "CLAUDE_PROJECT_DIR": str(repo_root)},
        text=True,
        cwd=str(repo_root),
        check=False,
        capture_output=True,
    )

    assert completed.returncode == 0
    output = json.loads(completed.stdout)
    assert output["received"] is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py -v`
Expected: FAIL — adapters still have old structure

- [ ] **Step 3: Rewrite Claude settings.json.tmpl — PreToolUse only**

Replace `templates/agent-integrations/claude/settings.json.tmpl`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/commit-governance-trigger.sh\" pre-tool-use"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Rewrite Claude daily agent template**

Replace `templates/agent-integrations/claude/agents/commit-governance.md.tmpl`:

```markdown
---
name: commit-governance
description: Daily commit governance — archive scattered docs and update changelog.
tools:
  - Read
  - Edit
  - Glob
  - Bash
model: {{governance_model}}
---

# Commit Governance — Daily

Execute daily commit governance following the rules in:

1. `.quick-init/rules/commit-governance-core.md` (shared rules)
2. `.quick-init/rules/commit-governance-daily.md` (daily mode rules)

Read both files first, then follow the daily mode instructions.

## Allowed Bash Commands

- `git status`, `git diff`, `git diff --cached`, `git add`
- `git ls-files`, `git rev-parse`, `git hash-object`
- `git log` (read-only)

## Forbidden Bash Commands

- `git push`, `git reset`, `git checkout`, `git rebase`
- `npm`, `pip`, dependency installation
- Destructive shell commands

Return only a concise summary to the main agent.
```

- [ ] **Step 5: Create Claude summarize agent template**

Create `templates/agent-integrations/claude/agents/commit-governance-summarize.md.tmpl`:

```markdown
---
name: commit-governance-summarize
description: Summarize iteration — extract decisions, update global docs, close iteration.
tools:
  - Read
  - Edit
  - Glob
  - Bash
model: {{governance_model}}
---

# Commit Governance — Summarize

Execute iteration summarization following the rules in:

1. `.quick-init/rules/commit-governance-core.md` (shared rules)
2. `.quick-init/rules/commit-governance-summarize.md` (summarize mode rules)

Read both files first, then follow the summarize mode instructions.

## Allowed Bash Commands

- `git status`, `git diff`, `git diff --cached`, `git add`
- `git ls-files`, `git rev-parse`, `git hash-object`
- `git log` (read-only)

## Forbidden Bash Commands

- `git push`, `git reset`, `git checkout`, `git rebase`
- `npm`, `pip`, dependency installation
- Destructive shell commands

Return only a concise summary to the main agent.
```

- [ ] **Step 6: Rewrite Claude agent-trigger.py.tmpl as thin launcher**

Replace `templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import json
import sys


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        print(json.dumps({"systemMessage": "quick-init: invalid JSON payload."}))
        return 0

    event = payload.get("hook_event_name", "")

    if event != "PreToolUse":
        print(json.dumps({"hookSpecificOutput": {"hookEventName": event}}))
        return 0

    tool_input = payload.get("tool_input", {})
    command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""
    lowered = command.lower()

    is_commit = "git commit" in lowered or "git push" in lowered
    if not is_commit:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": event}}))
        return 0

    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": event,
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        "quick-init: run commit-governance subagent first."
                    ),
                },
                "systemMessage": (
                    "quick-init: please run the commit-governance subagent"
                    " (.claude/agents/commit-governance.md) before committing."
                ),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 7: Keep trigger.sh.tmpl as-is — it's already a thin shell**

The current `trigger.sh.tmpl` is already thin (checks python3 and file existence, then delegates). No changes needed.

- [ ] **Step 8: Rewrite Codex hooks.json.tmpl — PreToolUse only**

Replace `templates/agent-integrations/codex/hooks.json.tmpl`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^Bash$",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/commit-governance-trigger.py\""
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 9: Rewrite Codex daily agent template**

Replace `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl`:

```toml
name = "commit-governance"
description = "Daily commit governance — archive scattered docs and update changelog."
model = "{{governance_model}}"
sandbox_mode = "workspace-write"
model_reasoning_effort = "medium"
developer_instructions = """
Execute daily commit governance following the rules in:
1. `.quick-init/rules/commit-governance-core.md` (shared rules)
2. `.quick-init/rules/commit-governance-daily.md` (daily mode rules)

Read both files first, then follow the daily mode instructions.

Allowed commands: git status, git diff, git add, git ls-files, git rev-parse, git hash-object, git log.
Do not use network, dependency installation, or destructive git operations.
Return only a short summary to the main agent.
"""
```

- [ ] **Step 10: Create Codex summarize agent template**

Create `templates/agent-integrations/codex/agents/commit-governance-summarize.toml.tmpl`:

```toml
name = "commit-governance-summarize"
description = "Summarize iteration — extract decisions, update global docs, close iteration."
model = "{{governance_model}}"
sandbox_mode = "workspace-write"
model_reasoning_effort = "high"
developer_instructions = """
Execute iteration summarization following the rules in:
1. `.quick-init/rules/commit-governance-core.md` (shared rules)
2. `.quick-init/rules/commit-governance-summarize.md` (summarize mode rules)

Read both files first, then follow the summarize mode instructions.

Allowed commands: git status, git diff, git add, git ls-files, git rev-parse, git hash-object, git log.
Do not use network, dependency installation, or destructive git operations.
Return only a short summary to the main agent.
"""
```

- [ ] **Step 11: Rewrite Codex trigger.py.tmpl as thin launcher**

Replace `templates/agent-integrations/codex/hooks/trigger.py.tmpl`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path


def _resolve_repo_root(cwd: Path) -> Path:
    toplevel = subprocess.check_output(
        ["git", "-C", str(cwd), "rev-parse", "--show-toplevel"],
        text=True,
    ).strip()
    return Path(toplevel)


def to_json_stdout(payload: dict) -> int:
    print(json.dumps(payload, ensure_ascii=False))
    return 0


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        return to_json_stdout({"systemMessage": "quick-init: invalid JSON payload."})

    event = payload.get("hook_event_name", "")

    if event != "PreToolUse":
        return to_json_stdout({"hookSpecificOutput": {"hookEventName": event}})

    tool_input = payload.get("tool_input", {})
    command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""
    lowered = command.lower()

    commit_patterns = [
        r"(^|[&;|])\s*(rtk\s+)?git\s+commit(\s|$)",
        r"(^|[&;|])\s*(rtk\s+)?git\s+push(\s|$)",
    ]
    is_commit = any(re.search(p, lowered) for p in commit_patterns)

    if not is_commit:
        return to_json_stdout({"hookSpecificOutput": {"hookEventName": event}})

    return to_json_stdout(
        {
            "hookSpecificOutput": {
                "hookEventName": event,
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    "quick-init: run commit-governance subagent first."
                ),
            },
            "systemMessage": (
                "quick-init: please run the commit-governance subagent before committing."
            ),
        }
    )


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 12: Update snapshot fixtures**

Update all snapshot files under `tests/fixtures/snapshots/` to match the new templates:

- `tests/fixtures/snapshots/claude/settings.json` — copy from updated `settings.json.tmpl`
- `tests/fixtures/snapshots/claude/agents/commit-governance.md` — copy from updated `commit-governance.md.tmpl`
- `tests/fixtures/snapshots/codex/hooks.json` — copy from updated `hooks.json.tmpl`
- `tests/fixtures/snapshots/codex/agents/commit-governance.toml` — copy from updated `commit-governance.toml.tmpl`

Create new snapshots:
- `tests/fixtures/snapshots/claude/agents/commit-governance-summarize.md` — copy from `commit-governance-summarize.md.tmpl`
- `tests/fixtures/snapshots/codex/agents/commit-governance-summarize.toml` — copy from `commit-governance-summarize.toml.tmpl`

- [ ] **Step 13: Run tests to verify they pass**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py -v`
Expected: all PASS

- [ ] **Step 14: Commit**

```bash
git add templates/agent-integrations/ tests/test_adapter_snapshots.py tests/fixtures/
git commit -m "feat: rewrite adapter templates for dual-frequency archive model"
```

---

### Task 5: Update SKILL.md and Skill Flow Tests

**Files:**
- Modify: `SKILL.md`
- Modify: `tests/test_skill_flow.py`

**Interfaces:**
- Consumes: all templates from Tasks 1-4
- Produces: updated Skill init flow that references the new archive model

- [ ] **Step 1: Write failing tests for updated flow**

Replace `tests/test_skill_flow.py` Required Flow tests:

```python
from __future__ import annotations

import re

from conftest import assert_not_contains, read_text


def _required_flow_lines(text: str) -> list[str]:
    in_required_flow = False
    lines: list[str] = []

    for raw_line in text.splitlines():
        if raw_line.strip() == "## Required Flow":
            in_required_flow = True
            continue
        if raw_line.startswith("## ") and in_required_flow:
            break
        if not in_required_flow:
            continue
        stripped = re.sub(r"^\s*(?:\d+\.|[-*])\s*", "", raw_line).strip()
        if stripped:
            lines.append(stripped)

    return lines


def test_skill_flow_exact_required_questions() -> None:
    text = read_text("SKILL.md")
    expected = [
        "Confirm Skill root templates are readable; abort if not.",
        "Ask for project name.",
        "Ask for one-sentence project goal.",
        "Ask for primary language.",
        "Ask which agent entry files to install (AGENTS.md, CLAUDE.md, GEMINI.md).",
        "Ask which agent hook integrations to install (Codex, Claude, or both).",
        "Ask for first iteration name.",
    ]
    flow_lines = _required_flow_lines(text)
    for line in expected:
        assert line in flow_lines, f"Missing flow line: {line}"


def test_skill_flow_has_gitignore_step() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    gitignore_lines = [line for line in flow_lines if ".gitignore" in line]
    assert len(gitignore_lines) >= 1, "Must have .gitignore step"


def test_skill_flow_has_version_metadata_step() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    metadata_lines = [line for line in flow_lines if "init-metadata" in line]
    assert len(metadata_lines) >= 1, "Must have init-metadata step"


def test_skill_flow_supports_go_and_rust() -> None:
    text = read_text("SKILL.md")
    assert "`go`" in text
    assert "`rust`" in text


def test_skill_flow_no_pre_commit_guard() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    guard_lines = [line for line in flow_lines if "pre-commit guard" in line.lower()]
    assert len(guard_lines) == 0, "Must not have pre-commit guard step"


def test_skill_flow_no_finalize_governance() -> None:
    text = read_text("SKILL.md")
    assert "finalize-governance" not in text


def test_skill_flow_copies_three_prompt_files() -> None:
    text = read_text("SKILL.md")
    assert "commit-governance-core.md" in text
    assert "commit-governance-daily.md" in text
    assert "commit-governance-summarize.md" in text


def test_skill_flow_installs_summarize_agent() -> None:
    text = read_text("SKILL.md")
    assert "commit-governance-summarize" in text


def test_skill_flow_no_intent_keywords() -> None:
    text = read_text("SKILL.md")
    assert "intent-keywords" not in text


def test_skill_flow_seed_iteration_present() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    seed_lines = [line for line in flow_lines if "seed iteration" in line.lower()]
    assert len(seed_lines) >= 1


def test_readme_development_checks_and_runtime_command() -> None:
    text = read_text("README.md")
    lines = [line.strip() for line in text.splitlines()]
    assert "## Development Checks" in lines
    assert "## 开发检查" in lines
    assert "/opt/anaconda3/envs/py311env/bin/python -m pytest" in lines


def test_readme_constraints_disallow_old_tooling_and_layout() -> None:
    text = read_text("README.md")
    assert (
        "It is not an npm package and does not expose a CLI."
        in text
    )
    expected = "Implementation work must keep the repository free of Node, npm, TypeScript, Vitest, old CLI entrypoints, and old generated docs directories."
    assert expected in text
    assert "## Development Checks" in text
    assert_not_contains(
        text.lower(),
        [
            " node.js ",
            "typescript package manager",
            "vitest.config",
            "package.json",
            "node_modules",
        ],
    )


def test_readme_mentions_go_and_rust() -> None:
    text = read_text("README.md")
    lower = text.lower()
    assert "go" in lower
    assert "rust" in lower


def test_readme_explains_updating_existing_installations() -> None:
    text = read_text("README.md")
    assert "# English" in text
    assert "# 中文" in text
    for heading in [
        "## Install From Source",
        "## Update Existing Installation",
        "## Init Flow",
        "## Generated Project Shape",
        "## Agent Integrations",
        "## Development Checks",
        "## 从源码安装",
        "## 更新已有安装",
        "## 初始化流程",
        "## 生成的项目结构",
        "## Agent 集成",
        "## 开发检查",
    ]:
        assert heading in text
    assert "git pull --ff-only" in text
    assert ".quick-init/" in text
    assert "incremental update" in text
    assert "增量更新" in text
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_skill_flow.py -v`
Expected: FAIL — SKILL.md still references guard, finalize, old prompt structure

- [ ] **Step 3: Update SKILL.md Required Flow**

In `SKILL.md`, update the Required Flow section. Remove steps referencing:
- `Copy templates/hooks/governance-trigger-core.py.tmpl`
- `Copy templates/hooks/intent-keywords.json`
- `Copy templates/hooks/finalize-governance.py.tmpl`
- `Install the Git pre-commit guard`

Add/update steps to:
- `Copy templates/subagents/commit-governance-core.md to .quick-init/rules/commit-governance-core.md`
- `Copy templates/subagents/commit-governance-daily.md to .quick-init/rules/commit-governance-daily.md`
- `Copy templates/subagents/commit-governance-summarize.md to .quick-init/rules/commit-governance-summarize.md`

Update step about agent integration to mention installing both `commit-governance` and `commit-governance-summarize` agent configs.

Remove any references to `finalize-governance`, `intent-keywords`, `pre-commit guard`, `last-governance-run.json`, or `governance-trigger.json`.

The updated Required Flow (keep existing step numbering style, adjust step numbers):

```markdown
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
16. Install selected agent integration files (daily and summarize agent configs, trigger scripts).
17. Copy `templates/subagents/commit-governance-core.md` to `.quick-init/rules/commit-governance-core.md`.
18. Copy `templates/subagents/commit-governance-daily.md` to `.quick-init/rules/commit-governance-daily.md`.
19. Copy `templates/subagents/commit-governance-summarize.md` to `.quick-init/rules/commit-governance-summarize.md`.
20. Create the seed iteration.
21. Write `.quick-init/state/init-metadata.json` with version, commit hash, language, and template hashes.
22. Run or request the selected agent's `commit-governance` workflow once.
```

- [ ] **Step 4: Run all tests**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add SKILL.md tests/test_skill_flow.py
git commit -m "feat: update SKILL.md for dual-frequency archive model"
```

---

### Task 6: Full Test Suite Verification

**Files:**
- No new files; verify everything passes together.

**Interfaces:**
- Consumes: all changes from Tasks 1-5
- Produces: green test suite

- [ ] **Step 1: Run the full test suite**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS

- [ ] **Step 2: If any failures, fix them**

Address any remaining test failures from cross-task interactions (e.g., snapshot mismatches, import errors from deleted modules).

- [ ] **Step 3: Verify no references to deleted components remain**

```bash
grep -rn "finalize-governance\|last-governance-run\|governance-trigger.json\|intent-keywords\|pre-commit-guard\|git-pre-commit-guard\|stagedDocsHash\|UserPromptSubmit" templates/ tests/ SKILL.md --include='*.py' --include='*.md' --include='*.json' --include='*.tmpl' --include='*.toml' --include='*.sh'
```

Expected: no matches (or only in the design spec `docs/superpowers/specs/` which is historical documentation).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining test failures after archive model redesign"
```

(Skip this step if no fixes were needed.)
