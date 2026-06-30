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
