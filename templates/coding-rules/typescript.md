# TypeScript Coding Rules

- Prefer precise TypeScript types.
- Avoid ambient global state.
- Keep I/O at command or adapter boundaries.
- Add focused tests for behavior changes.
- Use interface for public API contracts; reserve type aliases for unions and intersections.
- Avoid any; use unknown with type guards when the type is genuinely dynamic.
- Handle async rejections explicitly; every await should have error handling or propagation.
- Prefer const over let; never use var.
- Use named exports rather than barrel re-exports to preserve tree-shaking.
- Use union types or enums instead of magic strings.
