from __future__ import annotations

from conftest import REPO_ROOT, assert_not_contains, read_text


DELETED_PATHS = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vitest.config.ts",
    "cli.ts",
    "src",
    "tests/archive",
    "tests/git",
    "tests/helpers",
    "tests/init",
    "tests/iteration",
    "tests/local",
    "tests/cli.test.ts",
    "tests/e2e.test.ts",
    "tests/tempRepo.test.ts",
    "dist",
    "node_modules",
]


def test_old_cli_paths_are_removed() -> None:
    for relative_path in DELETED_PATHS:
        assert not (REPO_ROOT / relative_path).exists(), relative_path


def test_pytest_harness_files_are_present() -> None:
    for relative_path in ["pytest.ini", "tests/conftest.py"]:
        assert (REPO_ROOT / relative_path).is_file(), relative_path

    pytest_ini = read_text("pytest.ini")
    for expected_line in [
        "[pytest]",
        "testpaths = tests",
        "python_files = test_*.py",
        "addopts = -q",
    ]:
        assert expected_line in pytest_ini, expected_line

    ignore_text = read_text(".gitignore")
    for expected_line in [
        ".pytest_cache/",
        "__pycache__/",
        "*.pyc",
        ".weaver/",
        "dist/",
        "node_modules/",
    ]:
        assert expected_line in ignore_text, expected_line

    assert_not_contains(ignore_text, ["package.json", "vitest", "tsconfig"])
