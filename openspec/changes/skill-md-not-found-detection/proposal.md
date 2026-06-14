## Why

When a user runs `npm create skillet` in a project where `SKILL.md` lives inside a subdirectory (e.g. `skill/openspec-auto/SKILL.md`), the early gate summary prints `SKILL.md: not found`, even though the wizard immediately proceeds to discover and suggest that skill path. The message is technically accurate but misleading — it looks like an error that was silently resolved.

## What Changes

- The `SKILL.md:` line in the early gate summary will reflect whether any `SKILL.md` was found anywhere in the project, not just at the root.
- A new pure helper function `skillMdStatus(detected: DetectionResult): string` will encapsulate the display logic (root found → `"found"`, one nested → `"found in <path>"`, multiple → `"found in N locations"`, none → `"not found"`).
- The helper will be unit-tested independently of the interactive wizard.

No changes to `DetectionResult`, `detectEnvironment()`, `skill-dir.ts`, or `prompts.ts`.

## Capabilities

### New Capabilities

- `skill-md-not-found-detection`: Context-aware display of `SKILL.md` status in the early gate summary, using already-available `DetectionResult` fields.

### Modified Capabilities

- `skilletize-wizard`: The requirement "Early gate informs user before making any changes" currently specifies that the summary shows "whether `SKILL.md` was found." The scenario will be updated to reflect that the summary shows whether a `SKILL.md` was found at the root OR in any discovered skill directory, with the exact location when unambiguous.

## Impact

- `packages/create/src/run.ts` — one-line call replaced with `skillMdStatus(detected)` call.
- `packages/create/src/` — new pure helper function added (same file or small utility).
- Unit test file for `run.ts` or a new helper test file — new test cases for `skillMdStatus`.
- `openspec/specs/skilletize-wizard/spec.md` — delta spec tightens the early gate scenario wording.
