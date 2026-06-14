## 1. Export DEFAULT_IGNORE from hash module

- [ ] 1.1 Add `export` keyword to `DEFAULT_IGNORE` in `packages/core/src/hash.ts`
- [ ] 1.2 Update any existing tests that import from `hash.ts` if they expect `DEFAULT_IGNORE` to be private

## 2. Add filter to install copy step (test-first)

- [ ] 2.1 Write a failing unit test for `copyTree()` asserting that `.git/`, `node_modules/`, `.DS_Store`, and `.skill-manifest.json` are not present in the destination after copy
- [ ] 2.2 Write a failing unit test asserting that non-ignored files are still copied to the destination with their relative paths preserved
- [ ] 2.3 Import `DEFAULT_IGNORE` and `path` in `packages/core/src/install.ts`
- [ ] 2.4 Add `filter: (_src) => !DEFAULT_IGNORE.has(path.basename(_src))` to the `fs.cp` call in `copyTree()`. Note: `fs.cp` invokes `filter` once per entry (file or directory); returning `false` for a directory prunes its entire subtree. The first call is always the root source directory itself — skill directory names are never in `DEFAULT_IGNORE`, so the copy always proceeds.
- [ ] 2.5 Confirm all new and existing install tests pass

## 3. Add files allowlist to scaffold (test-first)

- [ ] 3.1 Write a failing unit test for `executeScaffold()` asserting that `npm pkg set "files[0]=bin" "files[1]=<skillDir>"` is executed in the command sequence (indexed-array form, safe with `runSync` double-quote wrapping — no inner quotes in the args)
- [ ] 3.2 Write a failing test asserting that the resulting `package.json` `files` field contains `"bin"` at index 0 and `<skillDir>` at index 1
- [ ] 3.3 Add `npm pkg set "files[0]=bin" "files[1]=${config.skillDir}"` to the npm command sequence in `packages/create/src/scaffold.ts` `executeScaffold()`. Note: this assumes no pre-existing `files` entries beyond index 1; `npm init -y` never sets `files`, so this is safe for the standard `create-skillet` fresh-project flow.
- [ ] 3.4 Confirm all new and existing scaffold tests pass

## 4. Add publish preview to wizard (test-first)

- [ ] 4.1 Extract the preview logic as a standalone function (e.g. `printPublishPreview(skillDir: string): Promise<void>`) in its own module or at the top of `run.ts`, so it can be unit-tested without invoking inquirer's raw-mode prompts. Write a failing unit test for this function asserting that it prints skill directory contents to stdout after `setupSkillDir` completes.
- [ ] 4.2 Write a failing test asserting that entries matching the ignore set are noted as excluded in the preview output
- [ ] 4.3 Write a failing test asserting that the preview handles a missing skill directory gracefully (no error, prints a note) — this is an error path, not the common case
- [ ] 4.4 Call `printPublishPreview` in `packages/create/src/run.ts` immediately after the `setupSkillDir` call (Step 7). This is a post-completion informational summary — the user has already confirmed at Step 5 (`proceedFinal`), and `setupSkillDir` has already populated the directory. Wizard integration tests that cover the full prompt flow are not feasible (inquirer requires a raw-mode TTY); rely on the extracted unit-testable function instead.
- [ ] 4.5 Confirm all new and existing wizard tests pass

## 5. Integration verification

- [ ] 5.1 Run the full test suite (`pnpm test`) and confirm all tests pass
- [ ] 5.2 Manually verify install: install a skill whose source directory contains `.git/` and confirm it is absent from the installed location
- [ ] 5.3 Manually verify scaffold: run `create-skillet` in a temp directory and confirm the generated `package.json` contains the expected `files` field
