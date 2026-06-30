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
    assert "`go`" in text
    assert "`rust`" in text


def test_skill_flow_no_pre_commit_guard() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    guard_lines = [line for line in flow_lines if "pre-commit guard" in line.lower()]
    assert len(guard_lines) == 0, "Must not have pre-commit guard step"


def test_skill_flow_no_finalize_governance() -> None:
    text = read_text("SKILL.md")
    assert "finalize-governance" not in text


def test_skill_flow_copies_three_prompt_files() -> None:
    text = read_text("SKILL.md")
    assert "commit-governance-core.md" in text
    assert "commit-governance-daily.md" in text
    assert "commit-governance-summarize.md" in text


def test_skill_flow_installs_summarize_agent() -> None:
    text = read_text("SKILL.md")
    assert "commit-governance-summarize" in text


def test_skill_flow_no_intent_keywords() -> None:
    text = read_text("SKILL.md")
    assert "intent-keywords" not in text


def test_skill_flow_seed_iteration_present() -> None:
    text = read_text("SKILL.md")
    flow_lines = _required_flow_lines(text)
    seed_lines = [line for line in flow_lines if "seed iteration" in line.lower()]
    assert len(seed_lines) >= 1


def test_readme_development_checks_and_runtime_command() -> None:
    text = read_text("README.md")
    lines = [line.strip() for line in text.splitlines()]
    assert "## Development Checks" in lines
    assert "## 开发检查" in lines
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


def test_readme_explains_updating_existing_installations() -> None:
    text = read_text("README.md")
    assert "# English" in text
    assert "# 中文" in text
    for heading in [
        "## Install From Source",
        "## Update Existing Installation",
        "## Init Flow",
        "## Generated Project Shape",
        "## Agent Integrations",
        "## Development Checks",
        "## 从源码安装",
        "## 更新已有安装",
        "## 初始化流程",
        "## 生成的项目结构",
        "## Agent 集成",
        "## 开发检查",
    ]:
        assert heading in text
    assert "git pull --ff-only" in text
    assert ".quick-init/" in text
    assert "incremental update" in text
    assert "增量更新" in text
