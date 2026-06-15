## Why

When a user presses Enter to leave the `description` or `author` prompt blank in the `create-skillet` wizard, the scaffold phase passes empty-string values to `npm pkg set`, which rejects bare `key=` tokens (with nothing after `=`) and exits non-zero — aborting the wizard after `npm init -y` has already run and leaving no recovery path. The `repositoryUrl` field already implements the correct guard pattern; applying it to `description` and `author` closes the crash with zero user-visible behaviour change.

## What Changes

- Skip `description` in the `npm pkg set` call when `config.description` is empty — matching the existing `repositoryUrl` guard in `scaffold.ts`
- Skip `author` in the `npm pkg set` call when `config.author` is empty — same treatment
- Add unit-test cases asserting that empty `description` / `author` values are omitted from the `npm pkg set` argument list

## Capabilities

### New Capabilities

_(none — this is a pure bug fix; no new user-visible capability is introduced)_

### Modified Capabilities

- `skilletize-wizard`: The execution requirement "All required fields are set" currently has scenarios that imply `description` and `author` are always written; the spec must clarify that both fields are omitted from `npm pkg set` when left blank (consistent with the already-specified `repositoryUrl` skip behaviour).

## Impact

- `packages/create/src/scaffold.ts` — two conditional spreads added to `pkgSetArgs`
- `packages/create/test/unit/scaffold.test.ts` — new test cases for empty `description` / `author`
- No changes to `prompts.ts`, `detect.ts`, or `run.ts`
- No new dependencies
- No breaking changes — blank-field behaviour was previously a crash; any code relying on that behaviour does not exist
