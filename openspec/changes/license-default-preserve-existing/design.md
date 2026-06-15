## Context

`packages/create` has a two-layer architecture for wizard defaults:

1. **`detect.ts`** — `detectEnvironment()` reads `package.json` and returns a `DetectionResult` struct.
2. **`prompts.ts`** — `collectConfig(detected)` uses `DetectionResult` values as prompt defaults.

Every wizard field (`name`, `version`, `author`, `description`) follows this pattern — except `license`, which skips detection entirely and hard-codes `'MIT'` as the prompt default. The root cause is a two-layer omission: `PackageJson` (the internal parse interface) has no `license` field, so `DetectionResult` has no `license` property, so `collectConfig` has nowhere to read a detected value from.

## Goals / Non-Goals

**Goals:**
- Detect `license` from `package.json` in `detectEnvironment()` and surface it through `DetectionResult`.
- Use the detected value as the License prompt default in `collectConfig()`, falling back to `'MIT'` when absent.
- Add test coverage for the detection and prompt-default behaviour.

**Non-Goals:**
- SPDX validation or formatting — npm accepts any SPDX expression verbatim; no normalization is needed.
- Changes to `scaffold.ts`, `run.ts`, or `@skillet-cli/core` — the downstream consumer already uses `config.license` verbatim.
- Multi-skill mode changes — license handling is identical in both modes.

## Decisions

### Decision 1: `license` type in `DetectionResult` is `string` (not `string | undefined`)

All other scalar fields in `DetectionResult` (`name`, `version`, `author`, `description`) are `string` with an empty string `''` as the "not present" sentinel. Using `string` (defaulting to `''`) keeps the type consistent and avoids spreading `undefined` checks into callers.

**Alternative considered:** `license?: string` (optional). Rejected because it would require `?? undefined` handling in `collectConfig` and diverges from the established pattern.

### Decision 2: Fallback logic lives in `prompts.ts`, not `detect.ts`

`detect.ts` stores the raw value from `package.json` (`pkg.license ?? ''`). The `'MIT'` fallback is applied in `prompts.ts` at the prompt call site (`detected.license || 'MIT'`), which is where the defaults for all other fields are finalized. This keeps `detect.ts` a pure extraction layer.

**Alternative considered:** Defaulting to `'MIT'` in `detect.ts`. Rejected because it would bake wizard policy into the detection layer, making it harder to test and reason about.

### Decision 3: No SPDX normalization

Compound SPDX expressions (e.g., `(MIT AND CC-BY-SA-4.0)`) are valid per the npm spec and must be preserved verbatim. Adding a normalization step would risk corrupting valid values and is out of scope for this bug fix.

### Decision 4: TDD — tests first

Per project convention, write failing tests for `detect.ts` and `prompts.ts` before touching the implementation files.

## Risks / Trade-offs

- [Risk] A project's `package.json` may contain a non-SPDX `license` string (e.g., `"SEE LICENSE IN LICENSE.txt"`). → No action needed: the value passes through unchanged, which is the correct behavior.
- [Risk] An empty `license: ""` in `package.json` would still result in the `'MIT'` default due to the `|| 'MIT'` fallback. → Acceptable: an empty string is semantically equivalent to "not set."
