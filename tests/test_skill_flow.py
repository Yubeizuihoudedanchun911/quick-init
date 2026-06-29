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
