from __future__ import annotations

from conftest import REPO_ROOT, assert_not_contains, read_text


DELETED_PATHS = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vitest.config.ts",
    "cli.ts",
    "src",
]


def test_old_cli_paths_are_removed() -> None:
    for relative_path in DELETED_PATHS:
        assert not (REPO_ROOT / relative_path).exists(), relative_path


def test_readme_and_skill_do_not_advertise_old_cli_commands() -> None:
    for relative_path in ["README.md", "SKILL.md"]:
        text = read_text(relative_path)
        assert_not_contains(
            text,
            [
                "quick-init init",
                "quick-init archive",
                "quick-init iteration",
                "npm link",
                "npm install",
            ],
        )


def test_skill_mentions_real_agent_hook_locations() -> None:
    skill = read_text("SKILL.md")
    assert ".codex/hooks.json" in skill
    assert ".claude/settings.json" in skill
