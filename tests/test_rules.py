from __future__ import annotations

from conftest import read_text


def test_commit_governance_core_contains_classification_rules() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert "docs/iterations/**" in text
    assert "specs/" in text
    assert "plans/" in text
    assert "summarize-only" in text
    assert "unclear" in text


def test_commit_governance_core_contains_state_outputs() -> None:
    text = read_text("templates/subagents/commit-governance-core.md")
    assert ".quick-init/state/last-governance-run.json" in text
    assert "docs/changelog.md" in text
    assert "manifest.json" in text
