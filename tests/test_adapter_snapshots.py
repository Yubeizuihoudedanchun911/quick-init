import json
import hashlib
import subprocess
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


def init_repo_with_staged_markdown(
    tmp_path: Path, *, doc_name: str = "notes.md", doc_text: str = "# notes"
) -> tuple[Path, Path]:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True)
    doc_file = repo_root / doc_name
    doc_file.write_text(doc_text, encoding="utf-8")
    subprocess.run(["git", "-C", str(repo_root), "add", doc_name], check=True)

    trigger = tmp_path / "trigger.py"
    trigger.write_text(
        read_text("templates/agent-integrations/codex/hooks/trigger.py.tmpl"),
        encoding="utf-8",
    )
    return repo_root, trigger


def compute_staged_markdown_hash(repo_root: Path, staged_files: list[str]) -> str:
    digest = hashlib.sha256()
    for path in staged_files:
        digest.update(path.encode("utf-8"))
        try:
            content = subprocess.check_output(
                ["git", "-C", str(repo_root), "show", f":{path}"], text=False
            )
        except subprocess.CalledProcessError:
            content = b""
        digest.update(content)
    return digest.hexdigest()


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
            "input": "run commit-governance now",
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
    repo_root, trigger = init_repo_with_staged_markdown(tmp_path)
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


def test_codex_trigger_pre_tool_use_deny_when_marked_for_commit(tmp_path: Path) -> None:
    repo_root, trigger = init_repo_with_staged_markdown(tmp_path)
    output = run_trigger_trigger(
        trigger,
        {
            "hook_event_name": "PreToolUse",
            "cwd": str(repo_root),
            "tool_input": {"command": "git commit -m x"},
        },
        cwd=repo_root,
    )

    assert output["hookSpecificOutput"]["hookEventName"] == "PreToolUse"
    assert output["hookSpecificOutput"]["permissionDecision"] == "deny"
    decision_reason = output["hookSpecificOutput"].get("permissionDecisionReason")
    assert isinstance(decision_reason, str) and decision_reason.strip()


def test_codex_trigger_user_prompt_submit_noop_for_non_submission_intent(tmp_path: Path) -> None:
    repo_root, trigger = init_repo_with_staged_markdown(tmp_path)
    output = run_trigger_trigger(
        trigger,
        {
            "hook_event_name": "UserPromptSubmit",
            "cwd": str(repo_root),
            "prompt": "请解释一下这个仓库结构",
        },
        cwd=repo_root,
    )

    assert output["hookSpecificOutput"]["hookEventName"] == "UserPromptSubmit"
    assert "decision" not in output
    assert not (repo_root / ".quick-init/state/governance-trigger.json").exists()


def test_codex_trigger_user_prompt_submit_blocks_stale_markdown(tmp_path: Path) -> None:
    repo_root, trigger = init_repo_with_staged_markdown(
        tmp_path, doc_name="nested-doc.md", doc_text="# stale notes"
    )
    state_file = repo_root / ".quick-init/state/last-governance-run.json"
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(
        json.dumps({"stagedDocsHash": "stale-hash"}, ensure_ascii=False), encoding="utf-8"
    )

    output = run_trigger_trigger(
        trigger,
        {
            "hook_event_name": "UserPromptSubmit",
            "cwd": str(repo_root),
            "message": "请帮我提交这次变更并推送",
        },
        cwd=repo_root,
    )

    assert output["decision"] == "block"
    reason = output.get("reason")
    assert isinstance(reason, str) and reason.strip()


def test_codex_trigger_user_prompt_submit_noop_when_hash_unchanged(tmp_path: Path) -> None:
    repo_root, trigger = init_repo_with_staged_markdown(
        tmp_path, doc_name="nested-doc.md", doc_text="# same notes"
    )
    staged_files_output = subprocess.check_output(
        ["git", "-C", str(repo_root), "diff", "--cached", "--name-only"],
        text=True,
    ).splitlines()
    staged_files = [path for path in staged_files_output if path.endswith(".md")]
    current_hash = compute_staged_markdown_hash(repo_root, staged_files)

    state_file = repo_root / ".quick-init/state/last-governance-run.json"
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(
        json.dumps({"stagedDocsHash": current_hash}, ensure_ascii=False), encoding="utf-8"
    )

    output = run_trigger_trigger(
        trigger,
        {
            "hook_event_name": "UserPromptSubmit",
            "cwd": str(repo_root),
            "input": "git commit",
        },
        cwd=repo_root,
    )

    assert "decision" not in output
    assert not (repo_root / ".quick-init/state/governance-trigger.json").exists()
