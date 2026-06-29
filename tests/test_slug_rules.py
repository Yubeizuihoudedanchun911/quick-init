from __future__ import annotations

from conftest import read_text


def test_slug_rules_are_explicit() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert "保留中文" in text
    assert "80" in text
    assert "-2" in text
    assert "YYYY-MM-DD-topic-slug" in text
