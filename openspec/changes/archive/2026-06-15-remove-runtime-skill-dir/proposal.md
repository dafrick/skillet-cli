## Why

The `skillDir` parameter in `RunOptions` was added as a stop-gap before `skillet.skillDir` in `package.json` existed. Now that `package.json` is the canonical source of truth for skill location (`skillet.skillDir` for single-skill, `skillet.skills` for multi-skill), the runtime parameter is dead API surface with no published consumers and should be removed before 1.0.

## What Changes

- **BREAKING**: Remove `skillDir?: string` from `RunOptions` in `@skillet-cli/core`
- `run()` now always reads skill location from `package.json` (`skillet.skillDir` or `skillet.skills`); callers that relied on the runtime override must migrate to `package.json`
- Error message when no `skillet` key is found is updated to name both fields

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `cli-surface`: Remove examples and scenario titles that reference passing `skillDir` directly to `run()`
- `skill-package-marker`: Remove the "Explicit skillDir passed to run() is honored" requirement block
- `skilldir-direct-path`: Remove the programmatic override requirement (lines covering `run({ skillDir })`)
- `dependency-install`: Remove the "or the skillDir argument to run()" clause
- `npm-readme`: Remove `skillDir` row from the RunOptions table

## Impact

- **`packages/core/src/run.ts`**: `RunOptions` interface and destructuring; error message
- **4 test files**: `backcompat.test.ts`, `verb-mode.test.ts`, `run-ctrl-c.test.ts`, `run-multi-skill.test.ts` — all migrated to write `package.json` instead of passing runtime `skillDir`
- **5 active specs**: `cli-surface`, `skill-package-marker`, `skilldir-direct-path`, `dependency-install`, `npm-readme`
- **`add-skilletizer-skill` change**: tasks 1.3 and 2.2 reference the removed param and need updating
