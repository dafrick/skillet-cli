## Why

When `npm create skillet` runs in a directory without an existing `package.json`, the terminal displays npm's auto-generated default JSON (version 1.0.0, license ISC, type commonjs, empty author) instead of the values the user configured in the prompts. The final `package.json` on disk is correct, but the misleading intermediate output causes users to believe the wrong values were written — this is a UX bug that erodes trust in the wizard.

## What Changes

- `runSync` in `packages/create/src/scaffold.ts` gains an optional `stdio` override parameter so callers can suppress specific stdio streams.
- The `npm init -y` call is changed to capture stdout (suppressing the "Wrote to..." block) while still inheriting stdin and stderr.
- After all `npm pkg set` commands complete, the final `package.json` content is read from disk and printed to stdout so the user sees the correct, configured values.
- The `skilletize-wizard` spec gains a new requirement and scenarios covering what terminal output appears during package initialization.

## Capabilities

### New Capabilities

_(none — this change modifies existing behavior, it does not introduce new user-facing capabilities)_

### Modified Capabilities

- `skilletize-wizard`: Adding requirement that `npm init -y` stdout is suppressed and the final `package.json` is displayed after all `npm pkg set` commands complete. This is a spec-level behavioral change to what the terminal shows during execution.

## Impact

- **Code**: `packages/create/src/scaffold.ts` — `runSync` helper and the `npm init -y` invocation; the section after `npm pkg set` commands where the final file is printed.
- **Spec**: `openspec/specs/skilletize-wizard/spec.md` — new requirement and scenarios under the "Execution uses only native npm commands" section area.
- **Tests**: Integration tests for `create-skillet` scaffold step should assert that the displayed `package.json` matches the configured inputs, not npm's defaults.
- **Dependencies**: None — no new packages required.
