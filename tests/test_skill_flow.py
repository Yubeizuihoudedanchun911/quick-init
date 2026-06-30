from __future__ import annotations

import re

from conftest import assert_not_contains, read_text


def _required_flow_lines(text: str) -> list[str]:
    in_required_flow = False
    lines: list[str] = []

    for raw_line in text.splitlines():
        if raw_line.strip() == "## Required Flow":
            in_required_flow = True
            continue
        if raw_line.startswith("## ") and in_required_flow:
            break
        if not in_required_flow:
            continue
        stripped = re.sub(r"^\s*(?:\d+\.|[-*])\s*", "", raw_line).strip()
        if stripped:
            lines.append(stripped)

    return lines


def test_skill_flow_exact_required_questions() -> None:
    text = read_text("SKILL.md")
    expected = [
        "Confirm Skill root templates are readable; abort if not.",
        "Ask for project name.",
        "Ask for one-sentence project goal.",
        "Ask for primary language.",
        "Ask which agent entry files to install (AGENTS.md, CLAUDE.md, GEMINI.md).",
        "Ask which agent hook integrations to install (Codex, Claude, or both).",
        "Ask for first iteration name.",
        "Create the seed iteration before installing the Git pre-commit guard.",
    ]
    flow_lines = _required_flow_lines(text)
    for line in expected:
        assert line in flow_lines, f"Missing flow line: {line}"


def test_skill_flow_has_gitignore_step() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    gitignore_lines = [line for line in flow_lines if ".gitignore" in line]
    assert len(gitignore_lines) >= 1, "Must have .gitignore step"


def test_skill_flow_has_version_metadata_step() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    metadata_lines = [line for line in flow_lines if "init-metadata" in line]
    assert len(metadata_lines) >= 1, "Must have init-metadata step"


def test_skill_flow_supports_go_and_rust() -> None:
    text = read_text("SKILL.md")
    if "supported" in text.lower():
        supported_line = text.lower().split("supported", maxsplit=1)[1].split("\n")[0]
        assert "`go`" in text or "go" in supported_line
    else:
        assert False, "Must list supported languages"
    assert "`rust`" in text


def test_skill_flow_seed_iteration_created_once_before_guard() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    seed_line = "Create the seed iteration before installing the Git pre-commit guard."
    assert flow_lines.count(seed_line) == 1
    guard_lines = [line for line in flow_lines if "Install the Git pre-commit guard" in line]
    assert len(guard_lines) >= 1
    assert flow_lines.index(seed_line) < flow_lines.index(guard_lines[0])


def test_readme_development_checks_and_runtime_command() -> None:
    text = read_text("README.md")
    lines = [line.strip() for line in text.splitlines()]
    assert "## Development Checks" in lines
    assert "/opt/anaconda3/envs/py311env/bin/python -m pytest" in lines


def test_readme_constraints_disallow_old_tooling_and_layout() -> None:
    text = read_text("README.md")
    assert (
        "It is not an npm package and does not expose a CLI."
        in text
    )
    expected = "Implementation work must keep the repository free of Node, npm, TypeScript, Vitest, old CLI entrypoints, and old generated docs directories."
    assert expected in text
    assert "## Development Checks" in text
    assert_not_contains(
        text.lower(),
        [
            " node.js ",
            "typescript package manager",
            "vitest.config",
            "package.json",
            "node_modules",
        ],
    )


def test_readme_mentions_go_and_rust() -> None:
    text = read_text("README.md")
    lower = text.lower()
    assert "go" in lower
    assert "rust" in lower
