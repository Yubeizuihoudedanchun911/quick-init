# Go Coding Rules

- Return errors as values; reserve panic for truly unrecoverable situations.
- Pass context.Context as the first parameter for cancellation and deadlines.
- Write godoc comments on all exported functions, types, and packages.
- Use table-driven tests with subtests (t.Run).
- Accept interfaces, return concrete types.
- Avoid init() functions; prefer explicit initialization in main or constructors.
- Use errgroup for managing concurrent goroutines with error propagation.
- Follow Go naming conventions: MixedCaps for exports, short variable names in narrow scopes.
