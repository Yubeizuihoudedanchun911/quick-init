from __future__ import annotations

from conftest import REPO_ROOT, read_text


REQUIRED_TEMPLATES = [
    "templates/project-structure/generic.md",
    "templates/agent-instructions/AGENTS.md",
    "templates/agent-instructions/CLAUDE.md",
    "templates/agent-instructions/GEMINI.md",
    "templates/coding-rules/generic.md",
    "templates/coding-rules/documentation.md",
    "templates/coding-rules/git-workflow.md",
    "templates/coding-rules/python.md",
    "templates/coding-rules/java.md",
    "templates/coding-rules/typescript.md",
    "templates/coding-rules/go.md",
    "templates/coding-rules/rust.md",
    "templates/coding-rules/design-principles.md",
    "templates/docs/onboard.md",
    "templates/docs/architecture.md",
    "templates/docs/decision.md",
    "templates/docs/iteration.md",
    "templates/docs/changelog.md",
    "templates/docs/adr.md",
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


def test_agent_instruction_templates_require_coding_rules() -> None:
    for relative_path in [
        "templates/agent-instructions/AGENTS.md",
        "templates/agent-instructions/CLAUDE.md",
        "templates/agent-instructions/GEMINI.md",
    ]:
        text = read_text(relative_path)
        assert ".coding-rules/generic.md" in text
        assert ".coding-rules/documentation.md" in text
        assert ".coding-rules/git-workflow.md" in text
        assert "python.md" in text
        assert "java.md" in text
        assert "typescript.md" in text


def test_version_file_exists_and_is_single_line() -> None:
    path = REPO_ROOT / "VERSION"
    assert path.exists(), "VERSION file must exist"
    text = path.read_text(encoding="utf-8").strip()
    assert text, "VERSION must not be empty"
    assert "\n" not in text, "VERSION must be a single line"


def test_design_principles_covers_key_areas() -> None:
    text = read_text("templates/coding-rules/design-principles.md")
    for keyword in [
        "Single Responsibility",
        "Open-Closed",
        "Dependency Inversion",
        "guard clause",
        "testability",
    ]:
        assert keyword.lower() in text.lower(), (
            f"design-principles.md must mention {keyword}"
        )


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


_DOCS_SKELETON_SECTIONS = {
    "templates/docs/onboard.md": ["Project Purpose", "Local Setup", "Common Commands"],
    "templates/docs/architecture.md": ["Module Boundaries", "External Integrations", "Data Flow"],
    "templates/docs/decision.md": ["ADR", "索引"],
    "templates/docs/iteration.md": ["归档文档", "执行摘要", "遗留问题"],
}


def test_docs_templates_have_skeleton_sections() -> None:
    for relative_path, sections in _DOCS_SKELETON_SECTIONS.items():
        text = read_text(relative_path)
        for section in sections:
            assert section in text, f"{relative_path} must contain '{section}'"


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
