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
