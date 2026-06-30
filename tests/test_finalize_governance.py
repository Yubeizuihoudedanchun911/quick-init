from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from conftest import REPO_ROOT, read_text


def staged_markdown_hash(repo_root: Path, files: list[str]) -> str:
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.encode("utf-8"))
        try:
            digest.update(
                subprocess.check_output(
                    ["git", "-C", str(repo_root), "show", f":{path}"],
                )
            )
        except subprocess.CalledProcessError:
            digest.update(b"")
    return digest.hexdigest()


def test_finalize_governance_template_exists() -> None:
    path = REPO_ROOT / "templates/hooks/finalize-governance.py.tmpl"
    assert path.exists()
    text = path.read_text(encoding="utf-8")
    assert "def staged_docs_hash(" in text
    assert "last-governance-run.json" in text
    assert "finalize-governance.py <active-iteration>" in text


def test_finalize_governance_hash_matches_trigger_hash(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True, text=True)

    doc = repo_root / "notes.md"
    doc.write_text("# Test Notes\n\nSome content.", encoding="utf-8")
    subprocess.run(["git", "-C", str(repo_root), "add", "notes.md"], check=True, text=True)

    staged_files = [
        line
        for line in subprocess.check_output(
            ["git", "-C", str(repo_root), "diff", "--cached", "--name-only"], text=True,
        ).splitlines()
        if line.endswith(".md")
    ]
    expected_hash = staged_markdown_hash(repo_root, staged_files)

    script_path = tmp_path / "finalize.py"
    script_path.write_text(
        read_text("templates/hooks/finalize-governance.py.tmpl"),
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(script_path), "2026-06-30-test-iteration"],
        cwd=str(repo_root),
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, "PYTHONHASHSEED": "0"},
    )

    assert completed.returncode == 0
    assert "governance finalized" in completed.stdout

    state_file = repo_root / ".quick-init/state/last-governance-run.json"
    assert state_file.exists()
    state = json.loads(state_file.read_text(encoding="utf-8"))
    assert state["activeIteration"] == "2026-06-30-test-iteration"
    assert state["stagedDocsHash"] == expected_hash
    assert state["manifestUpdated"] is True
    assert state["changelogSynced"] is True
    assert "archivedAt" in state


def test_finalize_governance_hash_stays_consistent_after_subagent_adds(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True, text=True)

    (repo_root / "spec.md").write_text("# Spec", encoding="utf-8")
    subprocess.run(["git", "-C", str(repo_root), "add", "spec.md"], check=True, text=True)

    iteration_dir = repo_root / "docs/iterations/2026-06-30-test"
    iteration_dir.mkdir(parents=True, exist_ok=True)
    (iteration_dir / "iteration.md").write_text("# iteration", encoding="utf-8")
    (iteration_dir / "manifest.json").write_text('{"status":"active"}', encoding="utf-8")
    subprocess.run(
        ["git", "-C", str(repo_root), "add",
         "docs/iterations/2026-06-30-test/iteration.md",
         "docs/iterations/2026-06-30-test/manifest.json"],
        check=True, text=True,
    )

    script_path = tmp_path / "finalize.py"
    script_path.write_text(
        read_text("templates/hooks/finalize-governance.py.tmpl"),
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(script_path), "2026-06-30-test"],
        cwd=str(repo_root),
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, "PYTHONHASHSEED": "0"},
    )
    assert completed.returncode == 0

    state = json.loads(
        (repo_root / ".quick-init/state/last-governance-run.json").read_text(encoding="utf-8"),
    )

    staged_files = [
        line
        for line in subprocess.check_output(
            ["git", "-C", str(repo_root), "diff", "--cached", "--name-only"], text=True,
        ).splitlines()
        if line.endswith(".md")
    ]
    verify_hash = staged_markdown_hash(repo_root, staged_files)
    assert state["stagedDocsHash"] == verify_hash


def test_finalize_governance_requires_iteration_argument(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True, text=True)

    script_path = tmp_path / "finalize.py"
    script_path.write_text(
        read_text("templates/hooks/finalize-governance.py.tmpl"),
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(repo_root),
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode == 1
    assert "Usage" in completed.stderr


def test_commit_governance_templates_reference_finalize_script() -> None:
    core = read_text("templates/subagents/commit-governance-core.md")
    assert "finalize-governance.py" in core
    assert "Do NOT compute" in core

    claude = read_text("templates/agent-integrations/claude/agents/commit-governance.md.tmpl")
    assert "finalize-governance.py" in claude

    codex = read_text("templates/agent-integrations/codex/agents/commit-governance.toml.tmpl")
    assert "finalize-governance.py" in codex
