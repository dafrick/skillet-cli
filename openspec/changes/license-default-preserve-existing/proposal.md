## Why

`create-skillet` always defaults the License prompt to the hard-coded string `'MIT'`, ignoring any `license` field already present in the project's `package.json`. Users who accept the default on a repo licensed under a different expression (e.g., `(MIT AND CC-BY-SA-4.0)`, `Apache-2.0`) silently overwrite their existing license. All other scaffold fields (`name`, `version`, `author`, `description`) already follow a detect-then-default pattern; `license` is the only exception.

## What Changes

- `detect.ts`: Add `license` to the `PackageJson` interface and to `DetectionResult`; populate it from `pkg.license ?? ''`.
- `prompts.ts`: Change the License prompt default from the hard-coded `'MIT'` to `detected.license || 'MIT'` (falls back to `'MIT'` when the field is absent or empty).
- `detect.test.ts`: Add assertions that `license` is extracted correctly for both simple SPDX identifiers and compound SPDX expressions.
- `prompts.test.ts`: Add an assertion that `collectConfig()` passes the detected license as the prompt's initial/default value.

No normalization or SPDX validation is added — npm accepts any SPDX expression verbatim, so the value is passed through unchanged.

## Capabilities

### New Capabilities

- `license-detection`: Detect the `license` field from an existing `package.json` and use it as the default value for the License prompt in the `create-skillet` wizard, preserving the project's current license when the user accepts the default.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- **Files changed**: `packages/create/src/detect.ts`, `packages/create/src/prompts.ts`, `packages/create/src/detect.test.ts`, `packages/create/src/prompts.test.ts`
- **No API or CLI surface changes**: the wizard UX is unchanged; the only difference is the pre-filled default in the License prompt.
- **No downstream impact**: `scaffold.ts` already uses `config.license` verbatim; no change needed there.
- **No breaking changes.**
