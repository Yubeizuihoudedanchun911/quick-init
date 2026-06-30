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
