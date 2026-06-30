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
