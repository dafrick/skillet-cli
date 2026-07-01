## 1. Bug fix: `.npmignore` not clobbered on re-run (test-first)

- [x] 1.1 In `packages/create/test/unit/scaffold.test.ts`, change the `.npmignore` describe block's `beforeEach` from a blanket `mockFsExistsSync.mockReturnValue(true)` to a path-aware `mockFsExistsSync.mockImplementation(...)` that returns `true` for `package.json` and `false` for `.npmignore` (or per-test as needed), without altering other passing assertions in that file.
- [x] 1.2 Add a new failing test in the same describe block: "does not overwrite `.npmignore` when it already exists" — mock `fs.existsSync` to return `true` for the `.npmignore` path, run `executeScaffold`, and assert `fsp.writeFile` (or the fs-promises mock) was never called with the `.npmignore` path.
- [x] 1.3 Run the new test and confirm it fails against current code (red) — `executeScaffold` in `packages/create/src/scaffold.ts` currently writes `.npmignore` unconditionally (lines ~115–119).
- [x] 1.4 In `packages/create/src/scaffold.ts`, wrap the `.npmignore` write in `if (!fs.existsSync(npmignorePath)) { ... }`, mirroring the existing `if (!fs.existsSync(pkgJsonPath))` guard used for `npm init` earlier in the same function.
- [x] 1.5 Run the full `scaffold.test.ts` suite and confirm all tests pass (green), including the existing "writes `.npmignore`" test (now exercised via the absent-file path) and the new "does not overwrite" test.

## 2. Spec delta for `.npmignore` scaffold behavior

- [x] 2.1 Confirm `openspec/changes/expand-skill-workflow/specs/skilletize-wizard/spec.md` already contains the ADDED requirement "Scaffold initializes .npmignore only when absent" with its two scenarios; no further action needed here beyond verifying it matches the implemented behavior from section 1.

## 3. Expansion guidance in wizard completion block (test-first)

- [x] 3.1 In `packages/create/src/run.ts`, design and write a pure function (e.g. `buildExpansionGuidance(): string`) that returns the "To expand your skill:" text block covering: (a) adding a new content directory via `npm pkg set files[N]=<newDir>/` with a caveat to check the current `files` array first; (b) simple content updates — bump version, `npm publish`, no re-scaffold; (c) structural changes — re-run `create-skillet`, with an explicit warning that this resets `name`/`version`/`description`/`author`; (d) verifying with `create-skillet check` before publishing. Write the function signature and a failing unit test for it first (e.g. in `packages/create/test/unit/completion-block.test.ts`, following the existing pattern used for `deriveOwnerRepo`), asserting the returned string contains each of the four guidance points and the metadata-reset warning — confirm the test fails (red) before the function exists / has a body.
- [x] 3.2 Implement `buildExpansionGuidance` to satisfy the test (green).
- [x] 3.3 Wire `buildExpansionGuidance()`'s output into the completion block in `run.ts`'s `.action()` handler, printed immediately after the existing "Next steps:" block (after line ~184) and before the plugin-marketplace share block, without altering the existing "Next steps:" `process.stdout.write` calls or their wording.
- [x] 3.4 Add or extend an e2e assertion (e.g. in `wizard.test.ts` or `completion-block.test.ts`) confirming the "To expand your skill:" text appears in the wizard's actual completion output, not just in the unit-tested helper.
- [x] 3.5 Run the full `packages/create` test suite and confirm everything passes.

## 4. README documentation

- [x] 4.1 Add a new `## Expanding your skill` section to `packages/create/README.md`, positioned between the end of `## Subcommands` and the start of `## Changelog`.
- [x] 4.2 In that section, document the three scenarios (add a directory, simple content update, structural re-run) with the same guidance content as the wizard's completion block, including the `files[N]` index caveat.
- [x] 4.3 In that section, document both footguns explicitly: re-running `create-skillet` resets `name`/`version`/`description`/`author`; `bin/cli.js` is unconditionally regenerated on every run (safe unless hand-edited).
- [x] 4.4 Add a cross-reference to `create-skillet check` (existing `### create-skillet check` subsection) as the way to verify what will be published before running `npm publish`.

## 5. Changelog entry

- [x] 5.1 Add a new version entry to `packages/create/README.md`'s `## Changelog` section noting: (a) the `.npmignore` fix (no longer clobbered on re-run), and (b) the new "Expanding your skill" documentation and completion-block guidance.

## 6. Final verification

- [x] 6.1 Run the full test suite for `packages/create` (unit + e2e) and confirm all tests pass.
- [x] 6.2 Run linting/type-checking for `packages/create` if configured, and confirm it passes.
- [x] 6.3 Manually review the rendered README section and the wizard's printed completion output (or a captured test snapshot) for wording clarity and consistency with the spec deltas.
