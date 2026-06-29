from __future__ import annotations

import json

from conftest import read_text


def test_codex_hooks_template_matches_snapshot() -> None:
    rendered = read_text("templates/agent-integrations/codex/hooks.json.tmpl")
    expected = read_text("tests/fixtures/snapshots/codex/hooks.json")
    assert json.loads(rendered) == json.loads(expected)


def test_codex_agent_template_matches_snapshot() -> None:
    rendered = read_text("templates/agent-integrations/codex/agents/commit-governance.toml.tmpl")
    expected = read_text("tests/fixtures/snapshots/codex/agents/commit-governance.toml")
    assert rendered == expected
