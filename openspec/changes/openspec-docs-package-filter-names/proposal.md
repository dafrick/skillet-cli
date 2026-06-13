## Why

Two archived OpenSpec `tasks.md` files reference `@skillet-cli/create` as the pnpm filter name for the `packages/create` package. The actual package name is `create-skillet`, so those filter commands silently match nothing. Fixing this keeps the archived docs accurate and prevents confusion for anyone referencing them.

## What Changes

- Replace every occurrence of `@skillet-cli/create` with `create-skillet` in `openspec/changes/archive/2026-06-11-npm-install-progress-feedback/tasks.md` (3 occurrences, lines 19–21).
- Replace every occurrence of `@skillet-cli/create` with `create-skillet` in `openspec/changes/archive/2026-06-11-post-move-skilldir-display/tasks.md` (1 occurrence, line 15).

No source code, tests, configuration, or active change files are touched.

## Capabilities

### New Capabilities

<!-- None — this is a documentation-only correction. -->

### Modified Capabilities

<!-- No spec-level behavior changes. The fix is confined to archived task files. -->

## Impact

- **Affected files**: Two `tasks.md` files inside `openspec/changes/archive/`.
- **No runtime impact**: Archived docs only; no code paths are changed.
- **No API or dependency changes**.
