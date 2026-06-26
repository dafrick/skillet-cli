## 1. Test: .npmignore existence guard (TDD — write tests first)

- [ ] 1.1 In `packages/create/test/unit/scaffold.test.ts`, locate the `executeScaffold — .npmignore` describe block (line ~678) and review the existing test that asserts `fsp.writeFile` is called with `**/node_modules`
- [ ] 1.2 Add a new test case: when `mockFsExistsSync` returns `true` for the `.npmignore` path, assert that `fsp.writeFile` is NOT called for any path ending in `.npmignore`
- [ ] 1.3 Add a new test case: when `mockFsExistsSync` returns `true` for the `.npmignore` path, assert that `fsp.writeFile` is not called and the existing file content is implicitly preserved (no overwrite call)
- [ ] 1.4 Run the new tests and confirm they fail (`.npmignore` write is still unconditional at this point)

## 2. Fix: .npmignore existence guard in scaffold.ts

- [ ] 2.1 In `packages/create/src/scaffold.ts` at lines 118–119, wrap the `fsp.writeFile(npmignorePath, ...)` call with `if (!fs.existsSync(npmignorePath))` — skip the write entirely if the file already exists
- [ ] 2.2 Run the full scaffold test suite and confirm all tests pass, including the newly added guard tests and the existing `.npmignore` write test (which covers the `existsSync` returning `false` path)

## 3. Test: Completion block expansion guidance (TDD — write tests first)

- [ ] 3.1 In `packages/create/test/unit/completion-block.test.ts` (or a new describe block in `run.test.ts` if no dedicated file exists), add test cases asserting that the completion block output includes the phrase "To expand your skill" after the "Next steps" block
- [ ] 3.2 Add test cases asserting the completion block references `npm pkg set files` for the new directory scenario
- [ ] 3.3 Add test cases asserting the completion block warns about `name`, `version`, `description`, `author` reset on re-run
- [ ] 3.4 Add test cases asserting the completion block mentions `bin/cli.js` always being overwritten
- [ ] 3.5 Add test cases asserting the completion block references `create-skillet check` for verification
- [ ] 3.6 Run the new tests and confirm they fail

## 4. Feature: Expansion guidance block in run.ts completion output

- [ ] 4.1 In `packages/create/src/run.ts` after line 184 (end of the existing Next Steps block, before the plugin marketplace block), add a "To expand your skill" section with `process.stdout.write` calls covering the three expansion scenarios
- [ ] 4.2 Scenario 1 — New directory: output a line explaining to run `npm pkg set files[N]=newdir/` and note that N depends on the current `files` array (for standard single-skill layout: `files[0]=bin`, `files[1]=<skillDir>`, so next is `files[2]`)
- [ ] 4.3 Scenario 2 — New files in existing skill dir: output a line explaining only a version bump and `npm publish` are needed; no wizard re-run required
- [ ] 4.4 Scenario 3 — Structural changes: output a line explaining to re-run `create-skillet`, with a warning that `name`, `version`, `description`, `author` will be re-asked with no pre-population and `bin/cli.js` will be overwritten
- [ ] 4.5 Add a line referencing `create-skillet check` for verifying tarball contents after any expansion
- [ ] 4.6 Run the completion block tests from step 3 and confirm they now pass

## 5. Documentation: README "Expanding your skill" section

- [ ] 5.1 In `packages/create/README.md`, locate the "Subcommands" section and the "Changelog" section that follows it
- [ ] 5.2 Insert a new `## Expanding your skill` H2 section between "Subcommands" and "Changelog"
- [ ] 5.3 Document Scenario 1 — Adding a new directory: `npm pkg set files[N]=newdir/` with the caveat about index, recommend `npm pkg get files` to see the current array first
- [ ] 5.4 Document Scenario 2 — New files in existing skill dir: version bump and `npm publish` only
- [ ] 5.5 Document Scenario 3 — Structural changes: re-run `create-skillet` with explicit warning box or callout that `name`, `version`, `description`, `author` are re-asked with no pre-population
- [ ] 5.6 Add explicit warning that `bin/cli.js` is always overwritten on re-run (safe only if unmodified; do not customize it)
- [ ] 5.7 Add note about using `create-skillet check` to verify tarball contents after expansion

## 6. Verification

- [ ] 6.1 Run `pnpm test --filter=create-skillet` (or equivalent) and confirm all tests pass with no regressions
- [ ] 6.2 Manually review the completion block output by running the wizard in a test directory to confirm the expansion guidance renders correctly
- [ ] 6.3 Review `packages/create/README.md` to confirm the new section reads clearly and the three scenarios are accurate
