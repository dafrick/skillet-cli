All implementation tasks follow test-driven development: write/extend the failing test first (using the existing mocked-`@inquirer/prompts` + pure-function patterns already established in `packages/create/test/unit/`), watch it fail, then implement the minimal code to pass, then refactor. Do not write implementation before its test exists and fails for the expected reason.

## 1. Bug fix: .npmignore overwrite guard

- [x] 1.1 In `packages/create/test/unit/scaffold.test.ts`, add a failing test: when `.npmignore` already exists with custom content before `executeScaffold` runs, the file is left unchanged after execution.
- [x] 1.2 In `packages/create/test/unit/scaffold.test.ts`, add/keep a test that `.npmignore` is still created with default content when it does not already exist.
- [x] 1.3 In `packages/create/src/scaffold.ts`, guard the `.npmignore` write with an existence check (`fs.existsSync`) so it is only written when absent.
- [x] 1.4 Run the scaffold test suite and confirm both tests pass.

## 2. Detection: recognize an existing skillet package

- [x] 2.1 In `packages/create/test/unit/detect.test.ts`, add failing tests for `DetectionResult.isExistingSkilletPackage`: true when `skillet.skillDir` present, true when `skillet.skills` present (array form), true when `skillet.skills` present (string form), false when neither present, false when no `package.json`.
- [x] 2.2 In `packages/create/test/unit/detect.test.ts`, add a failing test that `DetectionResult.files` captures the existing `files` array from `package.json` (and is empty/undefined when absent).
- [x] 2.3 In `packages/create/src/detect.ts`, extend the `PackageJson` interface's `skillet` sub-interface to include `skills?: string | string[]`.
- [x] 2.4 In `packages/create/src/detect.ts`, add `isExistingSkilletPackage` and `files` to `DetectionResult` and compute them in `detectEnvironment()`.
- [x] 2.5 Run the detect test suite and confirm all new tests pass; confirm no existing detect tests regress.

## 3. Intent menu: branch the bare command on re-run

- [x] 3.1 In `packages/create/test/unit/run.test.ts`, add a failing test that when `detected.isExistingSkilletPackage` is `true` and the early gate is accepted, the wizard calls the mocked `select()` (already stubbed in the test setup) with the four intent options, instead of proceeding directly into `collectConfig()`.
- [x] 3.2 In `packages/create/test/unit/run.test.ts`, add a failing test that when `detected.isExistingSkilletPackage` is `false`, the wizard does not call `select()` and proceeds directly into `collectConfig()` (existing first-run behavior unchanged).
- [x] 3.3 In `packages/create/test/unit/run.test.ts`, add a failing test that selecting "Just check what would be published" invokes the same check logic as `create-skillet check` and exits without calling `executeScaffold`.
- [x] 3.4 In `packages/create/src/run.ts`, implement the intent-menu branch: after the early gate is accepted, if `detected.isExistingSkilletPackage`, call `select()` with the four options and dispatch accordingly; otherwise keep the existing direct path into `collectConfig()`.
- [x] 3.5 Wire the "Just check" option to the existing `runCheck` logic.
- [x] 3.6 Wire "Reconfigure everything" to the existing `collectConfig()` → `executeScaffold()` path (behavior unchanged apart from the metadata diff added in section 5).
- [x] 3.7 Run the run.ts test suite and confirm all new and existing tests pass.

## 4. Quick flow: add a directory to the published package

- [x] 4.1 Write a failing unit test for a pure function (e.g. `computeAddDirectoryPlan(currentFiles, newDir)`) that appends a normalized directory entry to the current `files[]` array without disturbing existing entries or exposing an index in its output.
- [x] 4.2 Implement `computeAddDirectoryPlan` (in `scaffold.ts` or a new sibling module) to satisfy 4.1.
- [x] 4.3 Write a failing `run.test.ts` case: selecting "Add a directory to the published package" prompts only for a directory path (no metadata prompts), displays a plan naming the directory (not an index), asks for a single confirmation, and on accept runs `npm pkg set` for the updated `files` value only.
- [x] 4.4 Write a failing `run.test.ts` case: declining the add-directory confirmation results in no `npm pkg set` call.
- [x] 4.5 Implement the add-directory flow in `run.ts` (and/or `prompts.ts`) to satisfy 4.3 and 4.4, reusing `computeAddDirectoryPlan`.
- [x] 4.6 Run the relevant test suites and confirm all pass.

## 5. Quick flow: add another skill / convert to multi-skill

- [x] 5.1 Write failing unit tests for a pure function (e.g. `computeAddSkillPlan(detected, newSkillDir)`) covering: single-skill → multi-skill conversion (produces a `skillet.skills` value combining the original and new parent directories, plus updated `files[]`), and already-multi-skill → appended entry (existing `skillet.skills` entries preserved, new one appended).
- [x] 5.2 Implement `computeAddSkillPlan` to satisfy 5.1.
- [x] 5.3 Write a failing `run.test.ts` case: selecting "Add another skill / convert to multi-skill" prompts only for the new skill's directory (no metadata prompts), displays a plan naming the resulting directories (not an index), asks for a single confirmation, and on accept runs the corresponding `npm pkg set` commands for `skillet.skills` and `files` only.
- [x] 5.4 Write a failing `run.test.ts` case: declining the add-skill confirmation results in no `npm pkg set` call.
- [x] 5.5 Implement the add-skill flow in `run.ts` (and/or `prompts.ts`) to satisfy 5.3 and 5.4, reusing `computeAddSkillPlan`.
- [x] 5.6 Run the relevant test suites and confirm all pass.

## 6. Metadata diff + consent on the reconfigure path

- [x] 6.1 Write failing unit tests for a pure function (e.g. `diffMetadata(detected, config)`) that compares `name`, `version`, `description`, `author`, `license` and returns only the changed fields as `{field, current, next}` entries; verify it returns an empty result when nothing changed.
- [x] 6.2 Implement `diffMetadata` to satisfy 6.1.
- [x] 6.3 Write a failing `run.test.ts` case: on the "Reconfigure everything" path, after `collectConfig()` returns with at least one changed metadata field, a "Changes to published metadata:" block is printed (via `process.stdout.write` assertions) showing `current → new` for each changed field, before the existing preview-confirm step.
- [x] 6.4 Write a failing `run.test.ts` case: when no metadata fields changed, the "Changes to published metadata:" block is not printed.
- [x] 6.5 Write a failing `run.test.ts` case: when the diff block is shown and the user declines the single confirmation, no `npm pkg set` command runs and `package.json` is left unchanged.
- [x] 6.6 Implement the diff rendering in `run.ts`, folded into the existing "Ready to set up" / "Here's what I'll do:" preview step, gated by the existing single confirmation.
- [x] 6.7 Run the run.ts test suite and confirm all new and existing tests pass.

## 7. bin/cli.js overwrite guard

- [x] 7.1 Write a failing unit test: extract the `bin/cli.js` content generation into a pure function (e.g. `buildBinCliJs(...)`) and assert it produces byte-identical output to what `scaffold.ts` currently writes.
- [x] 7.2 Write a failing `scaffold.test.ts` case: when no `bin/cli.js` exists, it is written unconditionally (no prompt).
- [x] 7.3 Write a failing `scaffold.test.ts` case: when existing `bin/cli.js` content matches `buildBinCliJs()` output exactly, it is rewritten (or left as-is) without any warning or prompt.
- [x] 7.4 Write a failing `scaffold.test.ts`/`run.test.ts` case: when existing `bin/cli.js` content differs from `buildBinCliJs()` output, the wizard warns and asks for confirmation before overwriting.
- [x] 7.5 Write a failing test: declining the `bin/cli.js` overwrite confirmation leaves the existing file untouched and the wizard continues with remaining steps.
- [x] 7.6 Implement `buildBinCliJs()` extraction and the comparison/consent guard in `scaffold.ts`, reusing the function both to write the file and to compute the comparison target.
- [x] 7.7 Run the scaffold and run test suites and confirm all pass.

## 8. README: replace the doc-only "expand your skill" content

- [ ] 8.1 Update `packages/create/README.md`'s "Expanding your skill" section (or add one if absent) to describe the actual intent-menu-driven flow (add directory, add/convert skill, reconfigure, check) and explicitly state what each quick flow never touches, removing any manual `npm pkg set` / array-index instructions inherited from prior attempts.

## 9. Full verification

- [ ] 9.1 Run the full `packages/create` test suite (`pnpm --filter create-skillet test` or equivalent) and confirm all tests pass, including the full existing suite (no regressions).
- [ ] 9.2 Run lint/typecheck for `packages/create` and confirm clean.
- [ ] 9.3 Manually smoke-test the bare `create-skillet` command against a fixture directory with an existing `package.json` containing `skillet.skillDir`, confirming the intent menu appears and each of the four options behaves as specced.
