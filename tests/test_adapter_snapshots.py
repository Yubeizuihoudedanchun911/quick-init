from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from conftest import read_text


def test_codex_hooks_pretooluse_only() -> None:
    rendered = json.loads(read_text("templates/agent-integrations/codex/hooks.json.tmpl"))
    assert "PreToolUse" in rendered["hooks"]
    assert "UserPromptSubmit" not in rendered["hooks"]


def test_codex_daily_agent_references_core_and_daily() -> None:
    text = read_text("templates/agent-integrations/codex/agents/commit-governance.toml.tmpl")
    assert "commit-governance-core.md" in text
    assert "commit-governance-daily.md" in text
    assert "finalize-governance" not in text


def test_codex_summarize_agent_exists_and_references_core_and_summarize() -> None:
    text = read_text(
        "templates/agent-integrations/codex/agents/commit-governance-summarize.toml.tmpl"
    )
    assert "commit-governance-core.md" in text
    assert "commit-governance-summarize.md" in text
    assert "finalize-governance" not in text


def test_codex_trigger_is_thin_launcher() -> None:
    text = read_text("templates/agent-integrations/codex/hooks/trigger.py.tmpl")
    assert "governance_trigger_core" not in text
    assert "process_event" not in text
    assert "staged_docs_hash" not in text
    assert "intent" not in text.lower()


def test_claude_settings_pretooluse_only() -> None:
    rendered = json.loads(
        read_text("templates/agent-integrations/claude/settings.json.tmpl")
    )
    assert "PreToolUse" in rendered["hooks"]
    assert "UserPromptSubmit" not in rendered["hooks"]


def test_claude_daily_agent_references_core_and_daily() -> None:
    text = read_text(
        "templates/agent-integrations/claude/agents/commit-governance.md.tmpl"
    )
    assert "commit-governance-core.md" in text
    assert "commit-governance-daily.md" in text
    assert "finalize-governance" not in text


def test_claude_summarize_agent_exists_and_references_core_and_summarize() -> None:
    text = read_text(
        "templates/agent-integrations/claude/agents/commit-governance-summarize.md.tmpl"
    )
    assert "commit-governance-core.md" in text
    assert "commit-governance-summarize.md" in text
    assert "finalize-governance" not in text


def test_claude_trigger_sh_is_thin_shell() -> None:
    text = read_text("templates/agent-integrations/claude/hooks/trigger.sh.tmpl")
    assert "python3" in text
    assert "agent-trigger.py" in text
    assert "intent" not in text.lower()


def test_claude_agent_trigger_is_thin_launcher() -> None:
    text = read_text("templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl")
    assert "governance_trigger_core" not in text
    assert "process_event" not in text
    assert "staged_docs_hash" not in text
    assert "intent" not in text.lower()


def test_claude_trigger_wrapper_invocation(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True)

    hook_dir = repo_root / ".claude" / "hooks"
    trigger_path = hook_dir / "commit-governance-trigger.sh"
    hook_dir.mkdir(parents=True, exist_ok=True)
    trigger_path.write_text(
        read_text("templates/agent-integrations/claude/hooks/trigger.sh.tmpl"),
        encoding="utf-8",
    )

    quick_init_hook_dir = repo_root / ".quick-init" / "hooks"
    quick_init_hook_dir.mkdir(parents=True, exist_ok=True)
    (quick_init_hook_dir / "agent-trigger.py").write_text(
        "\n".join(
            [
                "import json, sys",
                "payload = json.loads(sys.stdin.read())",
                'print(json.dumps({"received": True, "event": payload.get("hook_event_name", "")}))',
            ]
        ),
        encoding="utf-8",
    )

    payload = json.dumps({"hook_event_name": "PreToolUse", "cwd": str(repo_root)})
    completed = subprocess.run(
        ["bash", str(trigger_path), "pre-tool-use"],
        input=payload,
        env={**os.environ, "CLAUDE_PROJECT_DIR": str(repo_root)},
        text=True,
        cwd=str(repo_root),
        check=False,
        capture_output=True,
    )

    assert completed.returncode == 0
    output = json.loads(completed.stdout)
    assert output["received"] is True
