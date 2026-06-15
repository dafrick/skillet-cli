## Why

When `create-skillet` runs in multi-skill mode, the generated `package.json` `"files"` array only includes the first discovered skill directory. All other skill directories are silently omitted, so `npm publish` produces a tarball that contains only one of N skills — a regression introduced in `730085d` (`feat(create): add multi-skill repo support`).

## What Changes

- **Fix `scaffold.ts` `files` array construction**: In multi-skill mode, generate one `files[N]` entry per entry in `config.skillsParentDirs` (with trailing slash) instead of the single unconditional `files[1]=${config.skillDir}`. Single-skill path is unchanged.
- **Add missing test coverage**: The `"executeScaffold — multi-skill mode"` describe block in `scaffold.test.ts` has no assertions about `files[]` entries. Add test cases verifying correct `files` args for single-parent, multi-parent, and single-skill (regression guard) scenarios.

## Capabilities

### New Capabilities

_(none — this is a bug fix)_

### Modified Capabilities

- `scaffold-files-allowlist`: The existing requirement covers single-skill mode only. Extend it to specify multi-skill behaviour: when `isMultiSkill` is `true`, `files[1..N]` SHALL be set to each entry in `skillsParentDirs` (with trailing slash) instead of `skillDir`.

## Impact

- `packages/create/src/scaffold.ts` — single localized change to `pkgSetArgs` construction
- `packages/create/test/unit/scaffold.test.ts` — new test cases in the existing multi-skill describe block
- No changes to `run.ts`, `prompts.ts`, `detect.ts`, or any public API
