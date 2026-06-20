## Why

Cursor is a widely-adopted AI-native IDE whose users frequently rely on `.cursor/rules/` for context injection. Skillet currently lacks a Cursor adapter, leaving a popular platform unserved. Adding first-class Cursor support broadens skillet's reach without introducing new architectural patterns.

## What Changes

- Add a new `cursor` adapter (`packages/core/src/adapters/cursor.ts`) that detects Cursor IDE at user and project scope
- Register the adapter automatically alongside the existing `claude`, `copilot`, and `agents` adapters in `packages/core/src/adapters/index.ts`
- Export the adapter from the package public surface so consumers can reference it directly if needed

## Capabilities

### New Capabilities

- `cursor-adapter`: Cursor IDE adapter that detects `~/.cursor/` (user scope) and `.cursor/` in cwd (project scope), and resolves install paths to `~/.cursor/skills/<skill.name>/` and `.cursor/skills/<skill.name>/` respectively

### Modified Capabilities

- `adapter-registry`: Extend the list of built-in v0.1 adapters registered by default to include `cursor` (currently specifies three: `claude`, `copilot`, `agents`)

## Impact

- **New file**: `packages/core/src/adapters/cursor.ts`
- **Modified file**: `packages/core/src/adapters/index.ts` — import and register `cursorAdapter`
- **Spec update**: `openspec/specs/adapter-registry/spec.md` — add scenarios for cursor detection and install path resolution
- No new dependencies; uses Node.js `fs` and `path` (already in use by other adapters)
- No breaking changes
