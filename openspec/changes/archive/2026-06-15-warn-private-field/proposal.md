## Why

When `create-skillet` runs against a repository whose `package.json` already contains `"private": true` (common in monorepos and internal packages), the wizard never reads, surfaces, or warns about that field. The resulting package cannot be published — `npm publish` fails immediately with "This package has been marked as private" — yet the wizard's completion block unconditionally prints `npm publish` as the next step, actively misleading the user.

## What Changes

- Add `private?: boolean` to the `PackageJson` detection interface and `isPrivate: boolean` to `DetectionResult` in `packages/create/src/detect.ts`
- Surface `private: true ⚠ (cannot publish until removed)` in the early-gate confirmation summary when detected
- Add a conditional prompt in `packages/create/src/prompts.ts`: when `isPrivate` is true, ask the user whether to remove the `private` flag; expose the answer as `removePrivate: boolean` on `WizardConfig`
- In `packages/create/src/scaffold.ts`, run `npm pkg delete private` when `config.removePrivate` is true
- In `packages/create/src/run.ts`, conditionally suppress `npm publish` from the completion next-steps block and replace it with a note to remove `"private": true` when the user declined to remove it

## Capabilities

### New Capabilities

- `private-field-warning`: Detect `"private": true` in an existing `package.json`, warn the user during the early-gate summary, prompt to resolve it, act on the answer during scaffold, and conditionally suppress the `npm publish` next-step when it remains.

### Modified Capabilities

- `skilletize-wizard`: The detection, confirmation summary, prompts, scaffold, and completion requirements all change to accommodate the new `private` field handling.

## Impact

- `packages/create/src/detect.ts` — interface and result type
- `packages/create/src/prompts.ts` — new conditional prompt, updated `WizardConfig` type
- `packages/create/src/scaffold.ts` — new `npm pkg delete private` call
- `packages/create/src/run.ts` — updated early-gate summary and completion block
- `packages/create/src/run.test.ts` (and related test files) — new test scenarios
- No changes to `packages/core`, `publish-preview.ts`, multi-skill branching, or any other wizard paths
