# Python Coding Rules

- Use type hints for public functions.
- Prefer pathlib for filesystem paths.
- Keep side effects at command boundaries.
- Use pytest for repository tests.
- Order imports: standard library, third-party, local; separate each group with a blank line.
- Use dataclass or TypedDict for structured data instead of bare dicts.
- Never use bare except; catch specific exception types.
- Prefer f-strings over % formatting or str.format().
- Follow PEP 8 naming: snake_case for functions and variables, PascalCase for classes.
- Use context managers (with statement) for resource management.
