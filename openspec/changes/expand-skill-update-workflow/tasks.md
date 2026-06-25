## 1. Fix .npmignore overwrite in scaffold

- [ ] 1.1 Write a failing test for the conditional `.npmignore` write: given an existing `.npmignore`, `executeScaffold` must leave it unchanged
- [ ] 1.2 Update `packages/create/src/scaffold.ts` to write `.npmignore` only when the file does not already exist
- [ ] 1.3 Confirm existing tests for the first-run case (`.npmignore` created when absent) still pass

## 2. Add expansion guidance to wizard completion block

- [ ] 2.1 Write a failing test that the wizard completion output includes a "To expand your skill" section after "Next steps"
- [ ] 2.2 Update `packages/create/src/run.ts` to print the "To expand your skill" section on successful completion, covering: `npm pkg set 'files[N]=new-dir/'`, safe re-run behavior, and `create-skillet check`
- [ ] 2.3 Confirm the private-package path (where `npm publish` is replaced by the `private` warning) also prints the expansion guidance

## 3. Add "Expanding your skill" to README

- [ ] 3.1 Add an "Expanding your skill" section to `packages/create/README.md` after the subcommands section, covering: `files` field management via `npm pkg set`, re-run safety, and `create-skillet check`
