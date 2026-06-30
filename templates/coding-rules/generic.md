# Generic Coding Rules

- Keep modules small and cohesive.
- Make behavior changes with focused tests.
- Prefer explicit contracts over implicit object shapes.
- Preserve unrelated user changes.
- Record unverified behavior as unverified.
- Use domain vocabulary in names; avoid generic names like data, info, manager, handler.
- Limit nesting to three levels; extract deeper logic into named functions.
- Mark public API changes explicitly in commit messages.
- Do not add dependencies for functionality achievable with the standard library.
- Validate inputs at system boundaries; trust internal code and framework guarantees.
- Never hardcode secrets, credentials, or API keys in source files.
- Prefer composition over inheritance when extending behavior.
