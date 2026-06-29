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
        "Ask for project name.",
        "Ask for one-sentence project goal.",
        "Ask for primary language.",
        "Ask whether to install Codex, Claude, or both.",
        "Ask for first iteration name.",
        "Create the seed iteration before installing the Git pre-commit guard.",
    ]
    flow_lines = _required_flow_lines(text)
    for line in expected:
        assert line in flow_lines


def test_skill_flow_seed_iteration_created_once_before_guard() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    seed_line = "Create the seed iteration before installing the Git pre-commit guard."
    assert flow_lines.count(seed_line) == 1
    assert flow_lines.index(seed_line) < flow_lines.index("Install the Git pre-commit guard.")


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
