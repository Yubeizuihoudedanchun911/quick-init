from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def assert_not_contains(text: str, forbidden: list[str]) -> None:
    found = [item for item in forbidden if item in text]
    assert found == []
