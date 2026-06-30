# Rust Coding Rules

- Use Result<T, E> for fallible operations; reserve panic! for invariant violations.
- Run clippy and address all warnings before committing.
- Add /// doc comments to all public items.
- Use #[derive] for standard trait implementations (Debug, Clone, PartialEq).
- Let the compiler infer lifetimes when possible; only annotate when required.
- Define domain error types with thiserror; avoid stringly-typed errors.
- Avoid unnecessary clone(); prefer borrowing and references.
- Use cargo test for all repository tests.
