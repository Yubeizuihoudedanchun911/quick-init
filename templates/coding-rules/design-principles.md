# Design Principles

## SOLID

- Single Responsibility: each module, class, or function does one thing.
- Open-Closed: extend behavior without modifying existing code.
- Liskov Substitution: subtypes must be usable wherever the base type is expected.
- Interface Segregation: do not force callers to depend on methods they do not use.
- Dependency Inversion: depend on abstractions, not concrete implementations.

## Clean Code

- Keep functions short and at one level of abstraction.
- Do not hide side effects in functions whose names do not reveal them.
- Prefer early returns to reduce nesting (guard clause pattern).
- Comments explain why, not what. Well-named identifiers replace what-comments.
- Avoid boolean flag parameters; split into two functions with clear names.
- Extract magic numbers and strings into named constants.
- Do not use exceptions for normal control flow.
- Naming uses domain vocabulary; avoid generic names like data, info, manager.

## Testability

- Make dependencies injectable; do not hardcode service addresses or file paths.
- Prefer pure functions: same input, same output, no side effects.
- Avoid global mutable state.
- Keep I/O at the boundary; business logic should be testable without I/O.
