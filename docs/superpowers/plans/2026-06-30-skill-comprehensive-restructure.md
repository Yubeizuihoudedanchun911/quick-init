# Skill Comprehensive Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure quick-init across all layers — SKILL.md flow, template content depth, adapter chain integrity, and architecture capabilities — addressing 19 identified gaps.

**Architecture:** The core Skill + templates + agent-rendering architecture stays. Changes add new template files (design-principles, go, rust, trigger core, intent keywords), expand existing templates with deeper content, extract shared trigger logic into a core module importable by both platform triggers, slim adapter templates to reference commit-governance-core.md as the single rule source, and add version tracking + incremental update support to SKILL.md.

**Tech Stack:** Markdown templates, `.tmpl` Python/Bash/JSON templates, Python 3 standard library, pytest. No Node, npm, TypeScript, Vitest.

## Global Constraints

- Repository has no production users; breaking changes are allowed.
- Do not introduce Node, npm, TypeScript, Vitest, or legacy CLI entrypoints.
- First version supports Codex and Claude agent hook integrations only.
- Tests run with `/opt/anaconda3/envs/py311env/bin/python -m pytest`.
- Java file headers use `@author jijunling <jijunling@kuaishou.com>`.
- All existing 51 tests must keep passing after each task (some tests are updated in place).
- Coding rules expansion requires web research via deep-research or web search tools to validate and deepen each language's best practices.

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `VERSION` | Single-line version string for quick-init |
| `templates/coding-rules/design-principles.md` | SOLID, Clean Code, testability rules |
| `templates/coding-rules/go.md` | Go-specific coding rules |
| `templates/coding-rules/rust.md` | Rust-specific coding rules |
| `templates/hooks/governance-trigger-core.py.tmpl` | Shared trigger logic: hash, intent, state |
| `templates/hooks/intent-keywords.json` | Extensible intent detection keywords |
| `templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl` | Claude trigger thin shell |

### Modified files

| File | Change |
|------|--------|
| `SKILL.md` | Rewrite Required Flow to 19 steps |
| `README.md` | Update language list, feature description |
| `templates/coding-rules/generic.md` | Expand from 5 to ~12 rules |
| `templates/coding-rules/python.md` | Expand from 4 to ~10 rules |
| `templates/coding-rules/typescript.md` | Expand from 4 to ~10 rules |
| `templates/coding-rules/java.md` | Expand from 4 to ~10 rules |
| `templates/docs/onboard.md` | Add Markdown skeleton |
| `templates/docs/architecture.md` | Add Markdown skeleton |
| `templates/docs/decision.md` | Add Markdown skeleton |
| `templates/docs/iteration.md` | Add Markdown skeleton |
| `templates/agent-instructions/AGENTS.md` | Add Codex-specific directives |
| `templates/agent-instructions/CLAUDE.md` | Add Claude-specific directives |
| `templates/agent-instructions/GEMINI.md` | Add Gemini-specific directives |
| `templates/agent-integrations/claude/hooks/trigger.sh.tmpl` | Add error handling |
| `templates/agent-integrations/claude/agents/commit-governance.md.tmpl` | Slim to platform config + core reference |
| `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl` | Slim to platform config + core reference |
| `templates/agent-integrations/codex/hooks/trigger.py.tmpl` | Refactor to thin shell calling core |
| `templates/project-structure/generic.md` | Add new directories |
| `tests/test_templates.py` | Add new templates to REQUIRED_TEMPLATES |
| `tests/test_skill_flow.py` | Update flow step assertions |
| `tests/test_adapter_snapshots.py` | Update snapshots and assertions |
| `tests/test_rules.py` | Verify core still has all classification rules |
| `tests/fixtures/snapshots/claude/agents/commit-governance.md` | Update to slimmed version |
| `tests/fixtures/snapshots/codex/agents/commit-governance.toml` | Update to slimmed version |

---

### Task 1: VERSION + design-principles.md + test registration

**Files:**
- Create: `VERSION`
- Create: `templates/coding-rules/design-principles.md`
- Modify: `tests/test_templates.py`

**Interfaces:**
- Consumes: nothing
- Produces: `VERSION` file readable by SKILL.md flow; `design-principles.md` in templates directory; updated REQUIRED_TEMPLATES list

- [ ] **Step 1: Write test for VERSION file**

Add to `tests/test_templates.py`:

```python
def test_version_file_exists_and_is_single_line() -> None:
    path = REPO_ROOT / "VERSION"
    assert path.exists(), "VERSION file must exist"
    text = path.read_text(encoding="utf-8").strip()
    assert text, "VERSION must not be empty"
    assert "\n" not in text, "VERSION must be a single line"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py::test_version_file_exists_and_is_single_line -v`
Expected: FAIL with "VERSION file must exist"

- [ ] **Step 3: Create VERSION file**

Create `VERSION` with content:

```
0.2.0
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py::test_version_file_exists_and_is_single_line -v`
Expected: PASS

- [ ] **Step 5: Add design-principles.md to REQUIRED_TEMPLATES and write content test**

In `tests/test_templates.py`, add `"templates/coding-rules/design-principles.md"` to `REQUIRED_TEMPLATES` list. Then add:

```python
def test_design_principles_covers_key_areas() -> None:
    text = read_text("templates/coding-rules/design-principles.md")
    for keyword in [
        "Single Responsibility",
        "Open-Closed",
        "Dependency Inversion",
        "guard clause",
        "testability",
    ]:
        assert keyword.lower() in text.lower(), f"design-principles.md must mention {keyword}"
```

- [ ] **Step 6: Run test to verify it fails**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py::test_design_principles_covers_key_areas -v`
Expected: FAIL with "design-principles.md"

- [ ] **Step 7: Create design-principles.md**

Create `templates/coding-rules/design-principles.md`:

```markdown
# Design Principles

## SOLID

- Single Responsibility: each module, class, or function does one thing.
- Open-Closed: extend behavior without modifying existing code.
- Liskov Substitution: subtypes must be usable wherever the base type is expected.
- Interface Segregation: do not force callers to depend on methods they do not use.
- Dependency Inversion: depend on abstractions, not concrete implementations.

## Clean Code

- Keep functions short and at one level of abstraction.
- Do not hide side effects in functions whose names do not reveal them.
- Prefer early returns to reduce nesting (guard clause pattern).
- Comments explain why, not what. Well-named identifiers replace what-comments.
- Avoid boolean flag parameters; split into two functions with clear names.
- Extract magic numbers and strings into named constants.
- Do not use exceptions for normal control flow.
- Naming uses domain vocabulary; avoid generic names like data, info, manager.

## Testability

- Make dependencies injectable; do not hardcode service addresses or file paths.
- Prefer pure functions: same input, same output, no side effects.
- Avoid global mutable state.
- Keep I/O at the boundary; business logic should be testable without I/O.
```

- [ ] **Step 8: Run all tests to verify everything passes**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS (including the new ones and existing 51)

- [ ] **Step 9: Commit**

```bash
git add VERSION templates/coding-rules/design-principles.md tests/test_templates.py
git commit -m "feat: add VERSION file and design-principles coding rules"
```

---

### Task 2: Deep-research and expand coding rules

**Files:**
- Modify: `templates/coding-rules/generic.md`
- Modify: `templates/coding-rules/python.md`
- Modify: `templates/coding-rules/typescript.md`
- Modify: `templates/coding-rules/java.md`
- Create: `templates/coding-rules/go.md`
- Create: `templates/coding-rules/rust.md`
- Modify: `tests/test_templates.py`

**Interfaces:**
- Consumes: existing coding-rules templates
- Produces: expanded coding-rules templates with ≥8 rules each; `go.md` and `rust.md` in REQUIRED_TEMPLATES

- [ ] **Step 1: Add go.md and rust.md to REQUIRED_TEMPLATES and write rule count tests**

In `tests/test_templates.py`, add `"templates/coding-rules/go.md"` and `"templates/coding-rules/rust.md"` to `REQUIRED_TEMPLATES`. Then add:

```python
_MINIMUM_RULE_COUNTS = {
    "templates/coding-rules/generic.md": 10,
    "templates/coding-rules/python.md": 8,
    "templates/coding-rules/typescript.md": 8,
    "templates/coding-rules/java.md": 8,
    "templates/coding-rules/go.md": 8,
    "templates/coding-rules/rust.md": 8,
    "templates/coding-rules/design-principles.md": 10,
}


def test_coding_rules_have_minimum_rule_count() -> None:
    for relative_path, minimum in _MINIMUM_RULE_COUNTS.items():
        text = read_text(relative_path)
        rule_lines = [
            line for line in text.splitlines()
            if line.startswith("- ") and len(line) > 10
        ]
        assert len(rule_lines) >= minimum, (
            f"{relative_path} has {len(rule_lines)} rules, need {minimum}"
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py::test_coding_rules_have_minimum_rule_count -v`
Expected: FAIL (go.md and rust.md missing, existing files have too few rules)

- [ ] **Step 3: Research best practices for each language**

Use the deep-research skill or web search to research coding best practices and conventions for: Python (PEP 8, PEP 20, modern idioms), TypeScript (strict mode, ESLint recommended rules), Java (Effective Java, modern Java idioms), Go (Effective Go, Go Proverbs, Go Code Review Comments), Rust (Rust API Guidelines, Clippy lints). Focus on rules that an AI coding agent should follow, not IDE settings or formatter configs.

- [ ] **Step 4: Expand generic.md**

Replace `templates/coding-rules/generic.md` with:

```markdown
# Generic Coding Rules

- Keep modules small and cohesive.
- Make behavior changes with focused tests.
- Prefer explicit contracts over implicit object shapes.
- Preserve unrelated user changes.
- Record unverified behavior as unverified.
- Use domain vocabulary in names; avoid generic names like data, info, manager, handler.
- Limit nesting to three levels; extract deeper logic into named functions.
- Mark public API changes explicitly in commit messages.
- Do not add dependencies for functionality achievable with the standard library.
- Validate inputs at system boundaries; trust internal code and framework guarantees.
- Never hardcode secrets, credentials, or API keys in source files.
- Prefer composition over inheritance when extending behavior.
```

- [ ] **Step 5: Expand python.md**

Replace `templates/coding-rules/python.md` with content from research. Minimum content:

```markdown
# Python Coding Rules

- Use type hints for public functions.
- Prefer pathlib for filesystem paths.
- Keep side effects at command boundaries.
- Use pytest for repository tests.
- Order imports: standard library, third-party, local; separate each group with a blank line.
- Use dataclass or TypedDict for structured data instead of bare dicts.
- Never use bare except; catch specific exception types.
- Prefer f-strings over % formatting or str.format().
- Follow PEP 8 naming: snake_case for functions and variables, PascalCase for classes.
- Use context managers (with statement) for resource management.
```

- [ ] **Step 6: Expand typescript.md**

Replace `templates/coding-rules/typescript.md` with content from research. Minimum content:

```markdown
# TypeScript Coding Rules

- Prefer precise TypeScript types.
- Avoid ambient global state.
- Keep I/O at command or adapter boundaries.
- Add focused tests for behavior changes.
- Use interface for public API contracts; reserve type aliases for unions and intersections.
- Avoid any; use unknown with type guards when the type is genuinely dynamic.
- Handle async rejections explicitly; every await should have error handling or propagation.
- Prefer const over let; never use var.
- Use named exports rather than barrel re-exports to preserve tree-shaking.
- Use union types or enums instead of magic strings.
```

- [ ] **Step 7: Expand java.md**

Replace `templates/coding-rules/java.md` with content from research. Minimum content:

```markdown
# Java Coding Rules

- Use `@author jijunling <jijunling@kuaishou.com>` in Java file headers.
- Keep package boundaries aligned with domain ownership.
- Prefer explicit null handling.
- Add focused tests for behavior changes.
- Use Optional for return values that may be absent; do not return null from public methods.
- Use record for immutable data carriers (Java 16+).
- Do not swallow exceptions; log or rethrow with context.
- Use Stream API for declarative collection transformations.
- Prefer constructor injection over field injection for dependencies.
- Use try-with-resources for all AutoCloseable resources.
```

- [ ] **Step 8: Create go.md**

Create `templates/coding-rules/go.md` with content from research. Minimum content:

```markdown
# Go Coding Rules

- Return errors as values; reserve panic for truly unrecoverable situations.
- Pass context.Context as the first parameter for cancellation and deadlines.
- Write godoc comments on all exported functions, types, and packages.
- Use table-driven tests with subtests (t.Run).
- Accept interfaces, return concrete types.
- Avoid init() functions; prefer explicit initialization in main or constructors.
- Use errgroup for managing concurrent goroutines with error propagation.
- Follow Go naming conventions: MixedCaps for exports, short variable names in narrow scopes.
```

- [ ] **Step 9: Create rust.md**

Create `templates/coding-rules/rust.md` with content from research. Minimum content:

```markdown
# Rust Coding Rules

- Use Result<T, E> for fallible operations; reserve panic! for invariant violations.
- Run clippy and address all warnings before committing.
- Add /// doc comments to all public items.
- Use #[derive] for standard trait implementations (Debug, Clone, PartialEq).
- Let the compiler infer lifetimes when possible; only annotate when required.
- Define domain error types with thiserror; avoid stringly-typed errors.
- Avoid unnecessary clone(); prefer borrowing and references.
- Use cargo test for all repository tests.
```

- [ ] **Step 10: Run all tests**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS

- [ ] **Step 11: Commit**

```bash
git add templates/coding-rules/ tests/test_templates.py
git commit -m "feat: expand coding rules and add Go/Rust language support"
```

---

### Task 3: Docs skeletons + agent instruction differentiation

**Files:**
- Modify: `templates/docs/onboard.md`
- Modify: `templates/docs/architecture.md`
- Modify: `templates/docs/decision.md`
- Modify: `templates/docs/iteration.md`
- Modify: `templates/agent-instructions/AGENTS.md`
- Modify: `templates/agent-instructions/CLAUDE.md`
- Modify: `templates/agent-instructions/GEMINI.md`
- Modify: `tests/test_templates.py`

**Interfaces:**
- Consumes: existing doc templates and agent instructions
- Produces: skeleton doc templates with H2 sections; differentiated agent instructions

- [ ] **Step 1: Write test for docs skeletons having H2 sections**

Add to `tests/test_templates.py`:

```python
_DOCS_SKELETON_SECTIONS = {
    "templates/docs/onboard.md": ["Project Purpose", "Local Setup", "Common Commands"],
    "templates/docs/architecture.md": ["Module Boundaries", "External Integrations", "Data Flow"],
    "templates/docs/decision.md": ["Record format"],
    "templates/docs/iteration.md": ["Creating a New Iteration", "Closing an Iteration"],
}


def test_docs_templates_have_skeleton_sections() -> None:
    for relative_path, sections in _DOCS_SKELETON_SECTIONS.items():
        text = read_text(relative_path)
        for section in sections:
            assert section in text, f"{relative_path} must contain '{section}'"
```

- [ ] **Step 2: Write test for agent instruction differentiation**

Add to `tests/test_templates.py`:

```python
def test_agent_instructions_have_shared_and_unique_content() -> None:
    agents_text = read_text("templates/agent-instructions/AGENTS.md")
    claude_text = read_text("templates/agent-instructions/CLAUDE.md")
    gemini_text = read_text("templates/agent-instructions/GEMINI.md")

    for text in [agents_text, claude_text, gemini_text]:
        assert ".coding-rules/generic.md" in text
        assert ".coding-rules/documentation.md" in text
        assert ".coding-rules/design-principles.md" in text

    assert "Codex" in agents_text or ".codex/" in agents_text
    assert "Edit tool" in claude_text or "subagent" in claude_text.lower()
    assert "no hook integration" in gemini_text.lower() or "manual" in gemini_text.lower()
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py::test_docs_templates_have_skeleton_sections tests/test_templates.py::test_agent_instructions_have_shared_and_unique_content -v`
Expected: FAIL

- [ ] **Step 4: Update docs skeletons**

Replace `templates/docs/onboard.md`:

```markdown
# Onboard

## Project Purpose

## Local Setup

## Common Commands

## Key Directories

## Operational Constraints
```

Replace `templates/docs/architecture.md`:

```markdown
# Architecture

## Module Boundaries

## External Integrations

## Data Flow

## Constraints and Invariants
```

Replace `templates/docs/decision.md`:

```markdown
# Decisions

Record format: date, context, decision, consequences, rollback notes.
```

Replace `templates/docs/iteration.md`:

```markdown
# Iterations

Each iteration directory contains `iteration.md`, `manifest.json`, `specs/`, and `plans/`.

## Creating a New Iteration

## Closing an Iteration
```

- [ ] **Step 5: Differentiate agent instructions**

Replace `templates/agent-instructions/CLAUDE.md`:

```markdown
# Claude Instructions

- Follow `.coding-rules/generic.md` for shared engineering rules.
- Follow `.coding-rules/design-principles.md` for design and code quality principles.
- Follow `.coding-rules/documentation.md` for documentation changes.
- Follow `.coding-rules/git-workflow.md` for commit, staging, and governance workflow.
- For source changes, follow the selected language rule in `.coding-rules/` when present: `python.md`, `java.md`, `typescript.md`, `go.md`, or `rust.md`.
- If the project uses `generic` as its primary language, rely on `.coding-rules/generic.md`.
- Keep `.quick-init/` local and uncommitted.
- Use Claude's Agent tool or subagent to execute commit-governance; do not read full staged diffs in the main agent context.
- Prefer the Edit tool over Bash sed/awk for file modifications.
```

Replace `templates/agent-instructions/AGENTS.md`:

```markdown
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
```

Replace `templates/agent-instructions/GEMINI.md`:

```markdown
# Gemini Instructions

- Follow `.coding-rules/generic.md` for shared engineering rules.
- Follow `.coding-rules/design-principles.md` for design and code quality principles.
- Follow `.coding-rules/documentation.md` for documentation changes.
- Follow `.coding-rules/git-workflow.md` for commit, staging, and governance workflow.
- For source changes, follow the selected language rule in `.coding-rules/` when present: `python.md`, `java.md`, `typescript.md`, `go.md`, or `rust.md`.
- If the project uses `generic` as its primary language, rely on `.coding-rules/generic.md`.
- Keep `.quick-init/` local and uncommitted.
- No automatic hook integration is available; run commit-governance manually before committing when staged Markdown has changed.
```

- [ ] **Step 6: Run all tests**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add templates/docs/ templates/agent-instructions/ tests/test_templates.py
git commit -m "feat: add docs skeletons and differentiate agent instructions"
```

---

### Task 4: Governance trigger core + intent keywords

**Files:**
- Create: `templates/hooks/governance-trigger-core.py.tmpl`
- Create: `templates/hooks/intent-keywords.json`
- Modify: `tests/test_templates.py`

**Interfaces:**
- Consumes: nothing
- Produces: `governance_trigger_core` module with functions `run_git_command`, `resolve_repo_root`, `staged_markdown_files`, `staged_docs_hash`, `last_governance_hash`, `write_governance_trigger`, `load_intent_keywords`, `is_negation_intent`, `is_submission_intent`, `is_submission_related_command`, `process_event`; `intent-keywords.json` with `strong_signals`, `action_words`, `negation_patterns`, `explanation_patterns` keys

- [ ] **Step 1: Write test for new template files and intent keywords structure**

Add to `tests/test_templates.py`:

```python
import json as _json


def test_governance_trigger_core_template_exists() -> None:
    path = REPO_ROOT / "templates/hooks/governance-trigger-core.py.tmpl"
    assert path.exists()
    text = path.read_text(encoding="utf-8")
    assert "def process_event(" in text
    assert "def staged_docs_hash(" in text
    assert "def is_submission_intent(" in text
    assert "def load_intent_keywords(" in text


def test_intent_keywords_json_is_valid() -> None:
    path = REPO_ROOT / "templates/hooks/intent-keywords.json"
    assert path.exists()
    data = _json.loads(path.read_text(encoding="utf-8"))
    assert "strong_signals" in data
    assert "action_words" in data
    assert "negation_patterns" in data
    assert "explanation_patterns" in data
    assert isinstance(data["strong_signals"], list)
    assert len(data["strong_signals"]) >= 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_templates.py::test_governance_trigger_core_template_exists tests/test_templates.py::test_intent_keywords_json_is_valid -v`
Expected: FAIL

- [ ] **Step 3: Create intent-keywords.json**

Create `templates/hooks/intent-keywords.json`:

```json
{
  "strong_signals": [
    "commit-governance",
    "结束迭代",
    "finalize iteration",
    "end iteration",
    "close iteration"
  ],
  "action_words": {
    "zh": ["提交", "推送", "发布"],
    "en": ["commit", "push", "publish"]
  },
  "negation_patterns": {
    "zh": ["不要", "不想", "不能", "别"],
    "en": ["don't", "do not", "not", "never"]
  },
  "explanation_patterns": [
    "explain",
    "what does",
    "how does",
    "what is",
    "what are",
    "difference",
    "解释",
    "说明",
    "区别"
  ]
}
```

- [ ] **Step 4: Create governance-trigger-core.py.tmpl**

Create `templates/hooks/governance-trigger-core.py.tmpl` with the full shared trigger logic. This module is the single source of truth for hash computation, intent detection, and governance state management. Both Codex and Claude triggers import from it.

```python
#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path


def run_git_command(root: Path, args: list[str]) -> str:
    return subprocess.check_output(
        ["git", "-C", str(root), *args], text=True,
    ).strip()


def resolve_repo_root(cwd: Path) -> Path:
    toplevel = run_git_command(cwd, ["rev-parse", "--show-toplevel"])
    return Path(toplevel)


def staged_markdown_files(root: Path) -> list[str]:
    output = run_git_command(root, ["diff", "--cached", "--name-only"])
    return [line for line in output.splitlines() if line.endswith(".md")]


def staged_docs_hash(root: Path, files: list[str]) -> str:
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.encode("utf-8"))
        try:
            content = subprocess.check_output(
                ["git", "-C", str(root), "show", f":{path}"], text=False,
            )
        except subprocess.CalledProcessError:
            content = b""
        digest.update(content)
    return digest.hexdigest()


def last_governance_hash(root: Path) -> str | None:
    state = root / ".quick-init/state/last-governance-run.json"
    if not state.exists():
        return None
    try:
        payload = json.loads(state.read_text(encoding="utf-8"))
    except Exception:
        return None
    value = payload.get("stagedDocsHash")
    return value if isinstance(value, str) else None


def write_governance_trigger(
    root: Path,
    event: str,
    hash_value: str,
    staged_files: list[str],
    tool_input: object,
) -> None:
    trigger = root / ".quick-init/state/governance-trigger.json"
    trigger.parent.mkdir(parents=True, exist_ok=True)
    trigger.write_text(
        json.dumps(
            {
                "hookEvent": event,
                "stagedDocsHash": hash_value,
                "stagedDocs": staged_files,
                "toolInput": tool_input,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def load_intent_keywords(hooks_dir: Path) -> dict:
    kw_path = hooks_dir / "intent-keywords.json"
    if not kw_path.exists():
        return {
            "strong_signals": ["commit-governance"],
            "action_words": {"zh": ["提交", "推送", "发布"], "en": ["commit", "push", "publish"]},
            "negation_patterns": {"zh": ["不要", "不想", "不能", "别"], "en": ["don't", "do not", "not", "never"]},
            "explanation_patterns": ["explain", "what does", "how does", "解释", "说明"],
        }
    return json.loads(kw_path.read_text(encoding="utf-8"))


def is_negation_intent(text: str, keywords: dict) -> bool:
    lowered = text.lower()
    for patterns in keywords.get("explanation_patterns", []):
        if patterns in lowered:
            return True
    for lang_patterns in keywords.get("negation_patterns", {}).values():
        for pattern in lang_patterns:
            action_words_all = []
            for lang_words in keywords.get("action_words", {}).values():
                action_words_all.extend(lang_words)
            for action in action_words_all:
                if pattern in lowered and action in lowered:
                    return True
    return False


def is_submission_intent(text: str, keywords: dict) -> bool:
    lowered = text.lower()

    for signal in keywords.get("strong_signals", []):
        if signal in lowered:
            return True

    if is_negation_intent(text, keywords):
        return False

    for lang_words in keywords.get("action_words", {}).values():
        for word in lang_words:
            if word in lowered:
                return True

    return False


def is_submission_related_command(tool_input: object) -> bool:
    if not isinstance(tool_input, dict):
        return False
    command = tool_input.get("command")
    if not isinstance(command, str):
        return False
    lowered = command.lower()
    patterns = [
        r"(^|[&;|])\s*rtk\s+git\s+commit(\s|$)",
        r"(^|[&;|])\s*git\s+commit(\s|$)",
        r"(^|[&;|])\s*rtk\s+git\s+push(\s|$)",
        r"(^|[&;|])\s*git\s+push(\s|$)",
        r"(^|[\s;&|])publish(\s|$)",
        r"(^|[\s;&|])finish\s+iteration(\s|$)",
        r"(^|[\s;&|])commit-governance(\s|$)",
    ]
    return any(re.search(pattern, lowered) for pattern in patterns)


def extract_prompt_text(payload: dict) -> str:
    for key in ("prompt", "message", "user_prompt", "input"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def process_event(
    root: Path,
    event: str,
    payload: dict,
    hooks_dir: Path,
) -> dict:
    keywords = load_intent_keywords(hooks_dir)

    if event == "PreToolUse" and not is_submission_related_command(
        payload.get("tool_input"),
    ):
        return {"action": "noop", "event": event}

    if event == "UserPromptSubmit" and not is_submission_intent(
        extract_prompt_text(payload), keywords,
    ):
        return {"action": "noop", "event": event}

    if event not in {"UserPromptSubmit", "PreToolUse"}:
        return {"action": "noop", "event": event, "context": "unsupported event"}

    try:
        files = staged_markdown_files(root)
    except subprocess.CalledProcessError:
        return {"action": "noop", "event": event, "context": "git error"}

    if not files:
        return {"action": "noop", "event": event, "context": "no staged markdown"}

    current_hash = staged_docs_hash(root, files)
    if current_hash == last_governance_hash(root):
        return {"action": "noop", "event": event, "context": "hash unchanged"}

    write_governance_trigger(root, event, current_hash, files, payload.get("tool_input"))

    if event == "PreToolUse":
        return {
            "action": "deny",
            "event": event,
            "reason": "quick-init governance is stale. Run commit-governance subagent first.",
        }

    return {
        "action": "block",
        "event": event,
        "reason": "quick-init governance is stale. Run commit-governance before continuing.",
    }
```

- [ ] **Step 5: Run all tests**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add templates/hooks/governance-trigger-core.py.tmpl templates/hooks/intent-keywords.json tests/test_templates.py
git commit -m "feat: add governance trigger core module and intent keywords"
```

---

### Task 5: Claude trigger chain completion

**Files:**
- Create: `templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl`
- Modify: `templates/agent-integrations/claude/hooks/trigger.sh.tmpl`
- Modify: `tests/test_adapter_snapshots.py`

**Interfaces:**
- Consumes: `governance_trigger_core.process_event` from Task 4
- Produces: Claude trigger thin shell at `.quick-init/hooks/agent-trigger.py` in target project; `trigger.sh.tmpl` with error handling

- [ ] **Step 1: Write test for Claude agent-trigger.py.tmpl existence and content**

Add to `tests/test_adapter_snapshots.py`:

```python
def test_claude_agent_trigger_template_exists_and_imports_core() -> None:
    text = read_text("templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl")
    assert "governance_trigger_core" in text
    assert "process_event" in text
    assert "def main(" in text
```

- [ ] **Step 2: Write test for trigger.sh error handling**

Add to `tests/test_adapter_snapshots.py`:

```python
def test_claude_trigger_sh_has_error_handling() -> None:
    text = read_text("templates/agent-integrations/claude/hooks/trigger.sh.tmpl")
    assert "command -v python3" in text
    assert '! -f' in text or '-f "$TRIGGER"' in text
    assert "exit 1" in text
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py::test_claude_agent_trigger_template_exists_and_imports_core tests/test_adapter_snapshots.py::test_claude_trigger_sh_has_error_handling -v`
Expected: FAIL

- [ ] **Step 4: Create Claude agent-trigger.py.tmpl**

Create `templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path


def _ensure_core_importable(root: Path) -> None:
    qi_hooks = str(root / ".quick-init" / "hooks")
    if qi_hooks not in sys.path:
        sys.path.insert(0, qi_hooks)


def to_json_stdout(payload: dict) -> int:
    print(json.dumps(payload, ensure_ascii=False))
    return 0


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        return to_json_stdout({"systemMessage": "quick-init hook payload is not valid JSON."})

    event = payload.get("hook_event_name", "")
    cwd = payload.get("cwd")
    cwd_path = Path(cwd).resolve() if isinstance(cwd, str) and cwd else Path.cwd()

    try:
        from governance_trigger_core import resolve_repo_root
        root = resolve_repo_root(cwd_path)
    except Exception:
        _ensure_core_importable(cwd_path)
        try:
            from governance_trigger_core import resolve_repo_root
            root = resolve_repo_root(cwd_path)
        except Exception:
            return to_json_stdout({
                "systemMessage": "quick-init hook could not resolve repository root.",
                "hookSpecificOutput": {"hookEventName": str(event)},
            })

    _ensure_core_importable(root)
    from governance_trigger_core import process_event

    hooks_dir = root / ".quick-init" / "hooks"
    result = process_event(root, event, payload, hooks_dir)

    if result["action"] == "noop":
        return to_json_stdout({
            "hookSpecificOutput": {
                "hookEventName": event,
                **({"additionalContext": result["context"]} if result.get("context") else {}),
            },
        })

    if result["action"] == "deny":
        return to_json_stdout({
            "hookSpecificOutput": {
                "hookEventName": event,
                "permissionDecision": "deny",
                "permissionDecisionReason": result["reason"],
            },
            "systemMessage": "quick-init: please run the commit-governance subagent before continuing.",
        })

    return to_json_stdout({
        "decision": "block",
        "reason": result["reason"],
        "hookSpecificOutput": {
            "hookEventName": event,
            "additionalContext": ".quick-init/state/governance-trigger.json was updated with stale hash.",
        },
    })


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 5: Update trigger.sh.tmpl with error handling**

Replace `templates/agent-integrations/claude/hooks/trigger.sh.tmpl`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
TRIGGER="${PROJECT_ROOT}/.quick-init/hooks/agent-trigger.py"

if ! command -v python3 >/dev/null 2>&1; then
  echo '{"error":"quick-init: python3 not found"}' >&2
  exit 1
fi

if [ ! -f "$TRIGGER" ]; then
  echo '{"error":"quick-init: agent-trigger.py not found"}' >&2
  exit 1
fi

exec python3 "$TRIGGER" "$@"
```

- [ ] **Step 6: Update trigger wrapper invocation test for new trigger.sh**

The existing `test_claude_trigger_wrapper_invocation` test in `tests/test_adapter_snapshots.py` reads trigger.sh.tmpl and runs it. Update it to account for the new error-handling lines. The test already writes an `agent-trigger.py` stub to the expected location, so the new file-existence check will pass. Verify it still passes:

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_adapter_snapshots.py::test_claude_trigger_wrapper_invocation -v`
Expected: PASS

- [ ] **Step 7: Run all tests**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
git add templates/agent-integrations/claude/hooks/ tests/test_adapter_snapshots.py
git commit -m "feat: complete Claude trigger chain with error handling"
```

---

### Task 6: Refactor Codex trigger + slim adapter templates

**Files:**
- Modify: `templates/agent-integrations/codex/hooks/trigger.py.tmpl`
- Modify: `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl`
- Modify: `templates/agent-integrations/claude/agents/commit-governance.md.tmpl`
- Modify: `tests/fixtures/snapshots/codex/agents/commit-governance.toml`
- Modify: `tests/fixtures/snapshots/claude/agents/commit-governance.md`
- Modify: `tests/test_adapter_snapshots.py`

**Interfaces:**
- Consumes: `governance_trigger_core` module from Task 4
- Produces: thin Codex trigger; slimmed adapter templates that reference `.quick-init/rules/commit-governance-core.md`

- [ ] **Step 1: Update Codex adapter snapshot test assertions**

In `tests/test_adapter_snapshots.py`, update `test_codex_agent_template_matches_snapshot` to check for core reference instead of inline rules:

```python
def test_codex_agent_template_matches_snapshot() -> None:
    rendered = read_text("templates/agent-integrations/codex/agents/commit-governance.toml.tmpl")
    expected = read_text("tests/fixtures/snapshots/codex/agents/commit-governance.toml")
    assert rendered == expected
    assert "commit-governance-core.md" in rendered
    assert "last-governance-run" in rendered
```

Update `test_claude_agent_template_matches_snapshot`:

```python
def test_claude_agent_template_matches_snapshot() -> None:
    rendered = read_text("templates/agent-integrations/claude/agents/commit-governance.md.tmpl")
    expected = read_text("tests/fixtures/snapshots/claude/agents/commit-governance.md")
    assert rendered == expected
    assert "commit-governance-core.md" in rendered
    assert "last-governance-run" in rendered
```

- [ ] **Step 2: Slim Codex commit-governance.toml.tmpl**

Replace `templates/agent-integrations/codex/agents/commit-governance.toml.tmpl`:

```toml
name = "commit-governance"
description = "Run quick-init commit governance before finishing commit/push/finalization workflows."
model = "{{governance_model}}"
sandbox_mode = "workspace-write"
model_reasoning_effort = "medium"
developer_instructions = """
Execute commit-time project governance following the rules in
`.quick-init/rules/commit-governance-core.md`.

Read that file first, then:
1. Read staged Markdown files from `git diff --cached --name-only`.
2. Classify each file per the core rules (archive, summarize-only, skip).
3. Archive or summarize as instructed.
4. Update iteration manifest and changelog per the core rules.
5. Write `.quick-init/state/last-governance-run.json` per the output state contract.

Allowed commands: git status, git diff, git add, git ls-files, git rev-parse, git hash-object.
Do not use network, dependency installation, or destructive git operations.
Return only a short summary to the main agent.
"""
```

Update snapshot `tests/fixtures/snapshots/codex/agents/commit-governance.toml` to match.

- [ ] **Step 3: Slim Claude commit-governance.md.tmpl**

Replace `templates/agent-integrations/claude/agents/commit-governance.md.tmpl`:

```markdown
---
name: commit-governance
description: Run quick-init commit governance before finishing commit, push, and iteration finalization workflows.
tools:
  - Read
  - Edit
  - Glob
  - Bash
model: {{governance_model}}
---

# Commit Governance

Execute commit-time project governance following the rules in
`.quick-init/rules/commit-governance-core.md`.

Read that file first, then:

1. Read staged Markdown files from `git diff --cached --name-only`.
2. Classify each file per the core rules (archive, summarize-only, skip).
3. Archive or summarize as instructed.
4. Update iteration manifest and changelog per the core rules.
5. Write `.quick-init/state/last-governance-run.json` per the output state contract.

## Commands

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

Return only a concise summary to the main agent.
```

Update snapshot `tests/fixtures/snapshots/claude/agents/commit-governance.md` to match.

- [ ] **Step 4: Refactor Codex trigger.py.tmpl to thin shell**

Replace `templates/agent-integrations/codex/hooks/trigger.py.tmpl` with a thin shell that imports the core:

```python
#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path


def _ensure_core_importable(root: Path) -> None:
    qi_hooks = str(root / ".quick-init" / "hooks")
    if qi_hooks not in sys.path:
        sys.path.insert(0, qi_hooks)


def to_json_stdout(payload: dict) -> int:
    print(json.dumps(payload, ensure_ascii=False))
    return 0


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        return to_json_stdout({"systemMessage": "quick-init hook payload is not valid JSON."})

    event = payload.get("hook_event_name", "")
    cwd = payload.get("cwd")
    cwd_path = Path(cwd).resolve() if isinstance(cwd, str) and cwd else Path.cwd()

    try:
        from governance_trigger_core import resolve_repo_root
        root = resolve_repo_root(cwd_path)
    except Exception:
        _ensure_core_importable(cwd_path)
        try:
            from governance_trigger_core import resolve_repo_root
            root = resolve_repo_root(cwd_path)
        except Exception:
            return to_json_stdout({
                "systemMessage": "quick-init hook could not resolve repository root from cwd.",
                "hookSpecificOutput": {"hookEventName": str(event)},
            })

    _ensure_core_importable(root)
    from governance_trigger_core import process_event

    hooks_dir = root / ".quick-init" / "hooks"
    result = process_event(root, event, payload, hooks_dir)

    if result["action"] == "noop":
        return to_json_stdout({
            "hookSpecificOutput": {
                "hookEventName": event,
                **({"additionalContext": f"quick-init governance: {result['context']}."} if result.get("context") else {}),
            },
        })

    if result["action"] == "deny":
        return to_json_stdout({
            "hookSpecificOutput": {
                "hookEventName": event,
                "permissionDecision": "deny",
                "permissionDecisionReason": result["reason"],
            },
            "systemMessage": "quick-init: please run the commit-governance subagent before continuing.",
        })

    return to_json_stdout({
        "decision": "block",
        "reason": result["reason"],
        "hookSpecificOutput": {
            "hookEventName": event,
            "additionalContext": ".quick-init/state/governance-trigger.json was updated with stale hash.",
        },
    })


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 5: Update trigger integration tests to provide core module**

In `tests/test_adapter_snapshots.py`, update the test helper functions to write the governance-trigger-core.py into the test repo's `.quick-init/hooks/` directory before running trigger tests. Update `init_repo_with_staged_markdown` to also set up the core:

```python
def _install_trigger_core(repo_root: Path) -> None:
    hooks_dir = repo_root / ".quick-init" / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    core_text = read_text("templates/hooks/governance-trigger-core.py.tmpl")
    (hooks_dir / "governance_trigger_core.py").write_text(core_text, encoding="utf-8")
    kw_text = read_text("templates/hooks/intent-keywords.json")
    (hooks_dir / "intent-keywords.json").write_text(kw_text, encoding="utf-8")
```

Call `_install_trigger_core(repo_root)` in `init_repo_with_staged_markdown` and in each trigger test that needs it. Update the `run_trigger_trigger` function if the trigger now reads from a different path.

- [ ] **Step 6: Run all tests**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS. Some existing trigger tests may need adjustment to the new output format or to provide the core module.

- [ ] **Step 7: Commit**

```bash
git add templates/agent-integrations/ tests/fixtures/snapshots/ tests/test_adapter_snapshots.py
git commit -m "feat: refactor triggers to thin shells and slim adapter templates"
```

---

### Task 7: SKILL.md rewrite

**Files:**
- Modify: `SKILL.md`
- Modify: `tests/test_skill_flow.py`

**Interfaces:**
- Consumes: all new templates and files from Tasks 1-6
- Produces: 19-step Required Flow with templates check, incremental update detection, .gitignore step, version metadata, go/rust/generic language support, split agent entry/hook steps

- [ ] **Step 1: Update skill flow test assertions**

Replace the flow expectations in `tests/test_skill_flow.py`:

```python
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
        "Create the seed iteration before installing the Git pre-commit guard.",
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
    assert "`go`" in text or "go" in text.lower().split("supported")[1].split("\n")[0] if "supported" in text.lower() else False
    assert "`rust`" in text


def test_skill_flow_seed_iteration_created_once_before_guard() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    seed_line = "Create the seed iteration before installing the Git pre-commit guard."
    assert flow_lines.count(seed_line) == 1
    guard_lines = [line for line in flow_lines if "Install the Git pre-commit guard" in line]
    assert len(guard_lines) >= 1
    assert flow_lines.index(seed_line) < flow_lines.index(guard_lines[0])
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest tests/test_skill_flow.py -v`
Expected: FAIL (new assertions don't match old SKILL.md)

- [ ] **Step 3: Rewrite SKILL.md**

Replace `SKILL.md` with the 19-step flow:

```markdown
---
name: quick-init
description: Use when initializing or updating project governance structure, coding rules, documentation conventions, iteration archives, changelog flow, or Codex/Claude commit-governance hooks for a repository
---

# quick-init

## Overview

Initialize or update a target repository with project governance structure and agent-native workflow rules. This Skill creates directories and Markdown governance files only; it does not create business code or language package configuration.

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
10. Ask for first iteration name (first init only).
11. Remove old quick-init prototype artifacts when present.
12. Ensure `.quick-init/` is in `.gitignore`.
13. Read templates from this Skill root under `templates/**`.
14. Create the governance structure.
15. Install agent entry instruction files from `templates/agent-instructions/**`.
16. Install selected agent integration files.
17. Copy `templates/subagents/commit-governance-core.md` to `.quick-init/rules/commit-governance-core.md`.
18. Copy `templates/hooks/governance-trigger-core.py.tmpl` to `.quick-init/hooks/governance_trigger_core.py`.
19. Copy `templates/hooks/intent-keywords.json` to `.quick-init/hooks/intent-keywords.json`.
20. Create the seed iteration before installing the Git pre-commit guard.
21. Install the Git pre-commit guard.
22. Write `.quick-init/state/init-metadata.json` with version, commit hash, language, and template hashes.
23. Run or request the selected agent's `commit-governance` workflow once.

## Generated Docs Model

Only generate these top-level docs:

- `docs/onboard/README.md`
- `docs/architecture/README.md`
- `docs/decisions/README.md`
- `docs/iterations/README.md`
- `docs/changelog.md`

Do not generate top-level `docs/specs/`, `docs/designs/`, `docs/verification/`, or `docs/research/`.

## Incremental Update

When `.quick-init/` exists, read `.quick-init/state/init-metadata.json` and compare template hashes. Only refresh files whose templates have changed. Merge strategy:

- `.coding-rules/**`: replace (managed by quick-init).
- `docs/**`: do not replace (user-filled content).
- agent integration configs: update quick-init marker blocks only.
- agent entry instructions: append new rules, do not delete user additions.

## Safety Rules

- Do not overwrite existing user content without showing a merge summary.
- Delete old quick-init CLI prototype files when this repository itself is being migrated.
- Agent entry instruction files must tell agents to follow `.coding-rules/generic.md`, `.coding-rules/design-principles.md`, `.coding-rules/documentation.md`, `.coding-rules/git-workflow.md`, and the matching language-specific coding rule when present.
- Use Codex `.codex/hooks.json` for Codex hooks.
- Use Claude `.claude/settings.json` for Claude hooks.
- Keep `.quick-init/` local and ignored.
```

- [ ] **Step 4: Run all tests**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add SKILL.md tests/test_skill_flow.py
git commit -m "feat: rewrite SKILL.md with 19-step flow and incremental update support"
```

---

### Task 8: README + project-structure update + final validation

**Files:**
- Modify: `README.md`
- Modify: `templates/project-structure/generic.md`
- Modify: `tests/test_skill_flow.py`

**Interfaces:**
- Consumes: all changes from Tasks 1-7
- Produces: updated README reflecting new capabilities; updated project-structure template; all tests passing

- [ ] **Step 1: Update project-structure/generic.md**

Replace `templates/project-structure/generic.md`:

```markdown
# Project Structure

Generate only governance directories and Markdown rule files.

```text
.coding-rules/
docs/onboard/
docs/architecture/
docs/decisions/
docs/iterations/
docs/changelog.md
.quick-init/
  state/
  hooks/
  rules/
```

Do not generate business source code, package metadata, language runtime configuration, or top-level verification, research, specs, or designs document trees.
```

- [ ] **Step 2: Update README.md**

Update `README.md` to reflect:
- New supported languages: `python`, `java`, `typescript`, `go`, `rust`, `generic`
- New coding-rules file: `design-principles.md`
- Split between agent entry files and agent hook integrations
- Incremental update capability
- VERSION file and init-metadata

Key sections to update:

In the "Init Flow" section, add `go` and `rust` to the language list. Add a note about incremental updates.

In the "Generated Project Shape" section, add `.quick-init/rules/` and `.quick-init/hooks/`.

Keep existing constraints: "It is not an npm package and does not expose a CLI" and the implementation-free-of-Node line.

- [ ] **Step 3: Update README test assertions**

In `tests/test_skill_flow.py`, verify README mentions new languages:

```python
def test_readme_mentions_go_and_rust() -> None:
    text = read_text("README.md")
    lower = text.lower()
    assert "go" in lower
    assert "rust" in lower
```

- [ ] **Step 4: Run full test suite**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: ALL tests PASS

- [ ] **Step 5: Run test count check**

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest --co -q | tail -1`
Expected: test count should be significantly higher than the original 51

- [ ] **Step 6: Commit**

```bash
git add README.md templates/project-structure/generic.md tests/test_skill_flow.py
git commit -m "feat: update README and project structure for comprehensive restructure"
```

- [ ] **Step 7: Final validation — review all changes**

Run: `git log --oneline HEAD~8..HEAD`
Verify 8 commits, one per task. Run the full test suite one final time:

Run: `/opt/anaconda3/envs/py311env/bin/python -m pytest -v`
Expected: ALL PASS
