## Why

After a skill author runs `create-skillet` once and publishes, there is no documented or safe path for expanding the package later — adding a new content directory, restructuring, or publishing a version bump. Re-running the wizard today silently overwrites `.npmignore` (destroying any custom exclusions added via the interactive triage flow) and resets `name`/`version`/`description`/`author` to whatever is typed into the prompts, which is a footgun for a published package (e.g., `v1.2.0` → reset to `v0.1.0`). Neither the wizard's completion output nor the README tell the author what to do in any of these situations.

## What Changes

- Fix `executeScaffold` in `packages/create/src/scaffold.ts` so `.npmignore` is written only when it does not already exist; if present, it is left untouched (mirrors the existing "don't clobber" guard already used for `npm init`).
- Add a new "To expand your skill" guidance block to the wizard's completion output (`packages/create/src/run.ts`), extracted into a small, unit-testable pure function (following the existing extraction pattern for `deriveOwnerRepo`/`runPostPublish`), covering: adding a new top-level directory via `npm pkg set files[N]=<dir>/`, simple content updates (bump version + `npm publish`), structural changes (re-run `create-skillet`, with an explicit warning that it resets `name`/`version`/`description`/`author`), and verifying with `create-skillet check`.
- Add a new `## Expanding your skill` section to `packages/create/README.md` (between `## Subcommands` and `## Changelog`) documenting the same three scenarios plus both footguns (wizard field reset on re-run, and `bin/cli.js` being unconditionally regenerated on every run — documented as-is, not changed).
- Add a `## Changelog` entry noting the `.npmignore` fix and the new expansion-guidance docs.

## Capabilities

### New Capabilities

(none — this change extends existing scaffold/wizard behavior and documentation; no new capability domain is introduced)

### Modified Capabilities

- `skilletize-wizard`: add a requirement that scaffold-time `.npmignore` initialization only occurs when `.npmignore` is absent (existing file is left untouched, no read/merge/append), and add a requirement that the wizard's completion output includes expansion guidance (adding a directory, simple content update, structural re-run with its reset warning, and verification via `create-skillet check`).

## Impact

- **Code**: `packages/create/src/scaffold.ts` (`executeScaffold`, `.npmignore` write, ~lines 115–119), `packages/create/src/run.ts` (completion block, ~lines 174–207; new extracted helper e.g. `buildExpansionGuidance`).
- **Tests**: `packages/create/test/unit/scaffold.test.ts` (`.npmignore` describe block needs a path-aware `fs.existsSync` mock instead of a blanket `mockReturnValue(true)`, plus a new "does not overwrite when present" test); a new/updated unit test for the extracted completion-block helper.
- **Docs**: `packages/create/README.md` (new `## Expanding your skill` section, new changelog entry).
- **Specs**: `openspec/specs/skilletize-wizard/spec.md` gets delta requirements for `.npmignore` scaffold-time initialization and completion-block expansion guidance.
- **No CLI surface change**: no new flags or commands; `create-skillet check`, `check.ts`, and `npmignore-triage.ts` are referenced but not modified.
