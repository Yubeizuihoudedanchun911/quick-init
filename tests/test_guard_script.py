from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from conftest import read_text


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


def init_repo_with_staged_markdown(
    tmp_path: Path,
    *,
    doc_name: str = "notes.md",
    doc_text: str = "# notes",
) -> tuple[Path, Path, list[str]]:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True, text=True)
    staged_file = repo_root / doc_name
    staged_file.write_text(doc_text, encoding="utf-8")
    subprocess.run(["git", "-C", str(repo_root), "add", doc_name], check=True, text=True)
    staged_files = (
        subprocess.check_output(
            ["git", "-C", str(repo_root), "diff", "--cached", "--name-only"], text=True
        )
        .splitlines()
    )
    return repo_root, (tmp_path / "guard.py"), [path for path in staged_files if path.endswith(".md")]


def write_state(
    repo_root: Path,
    *,
    active_iteration: str,
    hash_value: str,
    include_iteration: bool = True,
    include_changelog: bool = True,
) -> None:
    state_file = repo_root / ".quick-init/state/last-governance-run.json"
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(
        json.dumps(
            {
                "activeIteration": active_iteration,
                "stagedDocsHash": hash_value,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    if include_iteration:
        iteration_dir = repo_root / "docs/iterations" / active_iteration
        iteration_dir.mkdir(parents=True, exist_ok=True)
        (iteration_dir / "iteration.md").write_text("# iteration", encoding="utf-8")
        (iteration_dir / "manifest.json").write_text(
            json.dumps({"status": "active"}, ensure_ascii=False),
            encoding="utf-8",
        )

    if include_changelog:
        changelog = repo_root / "docs/changelog.md"
        changelog.parent.mkdir(parents=True, exist_ok=True)
        changelog.write_text("# changelog", encoding="utf-8")


def run_guard_script(repo_root: Path, script_path: Path) -> subprocess.CompletedProcess[str]:
    guard_text = read_text("templates/hooks/git-pre-commit-guard.py.tmpl")
    script_path.write_text(guard_text, encoding="utf-8")
    script_path.chmod(0o755)
    return subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(repo_root),
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, "PYTHONHASHSEED": "0"},
    )


def test_guard_template_mentions_required_checks() -> None:
    text = read_text("templates/hooks/git-pre-commit-guard.py.tmpl")
    assert ".quick-init/state/last-governance-run.json" in text
    assert "docs/changelog.md" in text
    assert "stagedDocsHash" in text
    assert "docs/iterations" in text
    assert "quick-init archive --staged" in text


def test_guard_script_allows_matching_hash_and_required_files(tmp_path: Path) -> None:
    repo_root, script_path, staged_files = init_repo_with_staged_markdown(tmp_path)
    current_hash = staged_markdown_hash(repo_root, staged_files)
    write_state(
        repo_root,
        active_iteration="2026-06-29-sample-iteration",
        hash_value=current_hash,
    )

    completed = run_guard_script(repo_root, script_path)
    assert completed.returncode == 0
    assert completed.stdout == ""
    assert completed.stderr == ""


def test_guard_script_blocks_stale_hash(tmp_path: Path) -> None:
    repo_root, script_path, staged_files = init_repo_with_staged_markdown(
        tmp_path, doc_text="# stale"
    )
    write_state(
        repo_root,
        active_iteration="2026-06-29-sample-iteration",
        hash_value=staged_markdown_hash(repo_root, staged_files) + "-stale",
    )

    completed = run_guard_script(repo_root, script_path)
    assert completed.returncode == 1
    assert "stale" in completed.stderr


def test_guard_script_blocks_when_required_docs_missing(tmp_path: Path) -> None:
    repo_root, script_path, staged_files = init_repo_with_staged_markdown(
        tmp_path, doc_text="# missing"
    )
    current_hash = staged_markdown_hash(repo_root, staged_files)
    write_state(
        repo_root,
        active_iteration="2026-06-29-sample-iteration",
        hash_value=current_hash,
        include_changelog=False,
    )

    completed = run_guard_script(repo_root, script_path)
    assert completed.returncode == 1
    assert "docs/changelog.md" in completed.stderr


def test_guard_script_blocks_when_iteration_files_missing(tmp_path: Path) -> None:
    repo_root, script_path, staged_files = init_repo_with_staged_markdown(
        tmp_path, doc_text="# missing iteration"
    )
    current_hash = staged_markdown_hash(repo_root, staged_files)
    write_state(
        repo_root,
        active_iteration="2026-06-29-sample-iteration",
        hash_value=current_hash,
        include_iteration=False,
    )

    completed = run_guard_script(repo_root, script_path)
    assert completed.returncode == 1
    assert "missing" in completed.stderr


def test_guard_script_returns_zero_when_no_staged_markdown(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    subprocess.run(["git", "-C", str(repo_root), "init"], check=True, text=True)

    script_path = tmp_path / "guard.py"
    completed = run_guard_script(repo_root, script_path)
    assert completed.returncode == 0
    assert completed.stderr == ""
    assert completed.stdout == ""
