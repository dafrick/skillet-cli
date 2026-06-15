# @skillet-cli/ui

Shared UI primitives (header rendering, chalk-based output helpers) used internally by `@skillet-cli/core` and `create-skillet`. Private package — not published to npm.

## Changelog

### v0.3.0

- **Font bundling fix**: ANSI Shadow font is now pre-loaded via `importable-fonts` at build time, resolving a crash when the package runs from a bundled install without filesystem font access

### v0.2.0

- **Extracted from `create-skillet`**: `@skillet-cli/ui` is now a standalone workspace package; all UI imports in `core` and `create` migrated to this package

### v0.1.0

Initial release.
