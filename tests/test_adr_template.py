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
