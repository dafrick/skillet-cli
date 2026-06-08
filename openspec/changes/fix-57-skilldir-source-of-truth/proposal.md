## Why

`create-skillet` generates a `bin/cli.js` that hardcodes `skillDir` and passes it to `run()`, causing `package.json`'s `skillet.skillDir` field to be silently ignored at runtime. There is also a semantic mismatch: `create-skillet` writes `skillet.skillDir` (a direct path to the skill directory), but `@skillet-cli/core` reads `skillet.skills` (a parent directory to scan for skill subdirectories) — so removing the hardcoded value from `bin/cli.js` without also teaching core to understand `skillDir` would break installs entirely.

## What Changes

- **`@skillet-cli/core` recognizes `skillet.skillDir`** — `SkilletPackageJson` gains a `skillDir` field; `readSkilletMarker` resolves it to an absolute path and returns it as a direct skill directory (bypassing subdirectory discovery)
- **`run()` uses `directSkillDir` when present** — if the marker returns a `directSkillDir`, it is used as the skill location without running `discoverSkillTrees`
- **`buildBinCliJs()` no longer hardcodes `skillDir`** — the generated `bin/cli.js` calls `await run({ pkg })` with no `skillDir` argument; package.json is the sole source of truth
- **Post-move step simplified** — `setupSkillDir` no longer rewrites `bin/cli.js` after moving files; it only updates `skillet.skillDir` in `package.json`

## Capabilities

### New Capabilities
- `skilldir-direct-path`: Core ability to interpret `skillet.skillDir` as a direct path to a single skill directory, distinct from the existing `skillet.skills` parent-directory discovery mechanism

### Modified Capabilities
- `skill-package-marker`: The `skillet` marker gains a new recognized field, `skillDir`, with defined resolution semantics
- `skilletize-wizard`: The generated `bin/cli.js` template changes; the post-move step no longer rewrites the binary

## Impact

- **`packages/core/src/types.ts`** — `SkilletPackageJson` interface
- **`packages/core/src/marker.ts`** — `SkilletMarker` interface + `readSkilletMarker` function
- **`packages/core/src/run.ts`** — `run()` function skill-dir resolution branch
- **`packages/create/src/scaffold.ts`** — `buildBinCliJs()` signature and output
- **`packages/create/src/skill-dir.ts`** — `setupSkillDir()` post-move step
- **Tests** — `packages/core/test/unit/marker.test.ts` (new), `packages/create/test/unit/scaffold.test.ts`, `packages/create/test/unit/skill-dir-post-move.test.ts`
- **No breaking changes** to the public API of `run()` — `skillDir` option remains supported for programmatic callers who pass it explicitly
