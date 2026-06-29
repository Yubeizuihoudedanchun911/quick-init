from __future__ import annotations

import subprocess
import json
import sys
from pathlib import Path
import pytest

from conftest import read_text


def test_codex_hooks_template_matches_snapshot() -> None:
    rendered = read_text("templates/agent-integrations/codex/hooks.json.tmpl")
    expected = read_text("tests/fixtures/snapshots/codex/hooks.json")
    assert json.loads(rendered) == json.loads(expected)


def test_codex_agent_template_matches_snapshot() -> None:
    rendered = read_text("templates/agent-integrations/codex/agents/commit-governance.toml.tmpl")
    expected = read_text("tests/fixtures/snapshots/codex/agents/commit-governance.toml")
    assert rendered == expected
    assert "Classification rules" in rendered
    assert "Changelog sync" in rendered
    assert "Iteration manifest" in rendered
    assert "last-governance-run" in rendered
    assert (
        "templates/subagents/commit-governance-core.md as the authoritative contract"
        not in rendered
    )


def run_trigger_trigger(
    script_path: Path, payload: dict[str, str], cwd: Path
) -> dict[str, object]:
    completed = subprocess.run(
        [sys.executable, str(script_path)],
        input=json.dumps(payload),
        text=True,
        check=False,
        cwd=str(cwd),
        capture_output=True,
    )
    assert completed.returncode == 0
    return json.loads(completed.stdout)


def test_codex_trigger_writes_state_to_repo_root_for_subdir(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    subdir = repo_root / "nested"
    repo_root.mkdir()
    subdir.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True)
    doc_file = repo_root / "nested-doc.md"
    doc_file.write_text("# nested doc", encoding="utf-8")

    subprocess.run(
        ["git", "-C", str(repo_root), "add", "nested-doc.md"], check=True
    )

    trigger = tmp_path / "trigger.py"
    trigger.write_text(
        read_text("templates/agent-integrations/codex/hooks/trigger.py.tmpl"),
        encoding="utf-8",
    )
    output = run_trigger_trigger(
        trigger,
        {
            "hook_event_name": "UserPromptSubmit",
            "cwd": str(subdir),
        },
        cwd=repo_root,
    )

    assert output["hookSpecificOutput"]["hookEventName"] == "UserPromptSubmit"
    root_state_file = repo_root / ".quick-init/state/governance-trigger.json"
    subdir_state_file = subdir / ".quick-init/state/governance-trigger.json"
    assert root_state_file.exists()
    assert not subdir_state_file.exists()


@pytest.mark.parametrize(
    "tool_command",
    [
        "ls",
        "pytest",
        "git status",
        "git diff",
    ],
)
def test_codex_trigger_pre_tool_use_noop(tmp_path: Path, tool_command: str) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True)
    doc_file = repo_root / "notes.md"
    doc_file.write_text("# notes", encoding="utf-8")
    subprocess.run(["git", "-C", str(repo_root), "add", "notes.md"], check=True)

    trigger = tmp_path / "trigger.py"
    trigger.write_text(
        read_text("templates/agent-integrations/codex/hooks/trigger.py.tmpl"),
        encoding="utf-8",
    )
    output = run_trigger_trigger(
        trigger,
        {
            "hook_event_name": "PreToolUse",
            "cwd": str(repo_root),
            "tool_input": {"command": tool_command},
        },
        cwd=repo_root,
    )

    assert output["hookSpecificOutput"]["hookEventName"] == "PreToolUse"
    assert output["hookSpecificOutput"].get("permissionDecision") is None
    assert not (repo_root / ".quick-init/state/governance-trigger.json").exists()
