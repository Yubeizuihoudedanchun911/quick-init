# Java Coding Rules

- Use `@author jijunling <jijunling@kuaishou.com>` in Java file headers.
- Keep package boundaries aligned with domain ownership.
- Prefer explicit null handling.
- Add focused tests for behavior changes.
- Use Optional for return values that may be absent; do not return null from public methods.
- Use record for immutable data carriers (Java 16+).
- Do not swallow exceptions; log or rethrow with context.
- Use Stream API for declarative collection transformations.
- Prefer constructor injection over field injection for dependencies.
- Use try-with-resources for all AutoCloseable resources.
