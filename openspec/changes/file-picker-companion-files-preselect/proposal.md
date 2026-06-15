## Why

When `create-skillet` encounters a flat repo (SKILL.md at root with sibling files/directories), the multi-select file-picker only pre-selects `SKILL.md` and a handful of hard-coded directory names (`resources`, `assets`, `templates`). All other companion content — directories like `scripts/`, `prompts/`, `examples/`, etc. — is unchecked by default. A user who accepts the defaults silently ships an incomplete package without realising it.

## What Changes

- Remove the `SKILL_DIRS` allowlist constant from `packages/create/src/skill-dir.ts`
- Invert `getPreselected()` from an allowlist to a blocklist: pre-select everything except known infrastructure/noise items
- Extend the exclusion set to include `package.json`, `node_modules/`, and `bin/` alongside existing lock files and dotfiles
- Update `openspec/specs/skilletize-wizard/spec.md` to document the new blocklist-based pre-selection behavior

## Capabilities

### New Capabilities

_(none — this is a bug fix, not a new capability)_

### Modified Capabilities

- `skilletize-wizard`: Pre-selection logic in the file-picker checkbox scenario changes from an allowlist of named directories to a blocklist of infrastructure/noise items. Any companion directory not on the blocklist is now pre-selected by default.

## Impact

- `packages/create/src/skill-dir.ts` — `SKILL_DIRS` constant removed; `getPreselected()` logic inverted
- `packages/create/test/unit/skill-dir.test.ts` — existing `scripts/` assertion flips; new tests cover `package.json`, `node_modules/`, `bin/` exclusion
- `openspec/specs/skilletize-wizard/spec.md` — checkbox scenario updated to describe blocklist behavior
