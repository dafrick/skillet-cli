## 1. Export DEFAULT_IGNORE from hash module

- [ ] 1.1 Add `export` keyword to `DEFAULT_IGNORE` in `packages/core/src/hash.ts`
- [ ] 1.2 Update any existing tests that import from `hash.ts` if they expect `DEFAULT_IGNORE` to be private

## 2. Add filter to install copy step (test-first)

- [ ] 2.1 Write a failing unit test for `copyTree()` asserting that `.git/`, `node_modules/`, `.DS_Store`, and `.skill-manifest.json` are not present in the destination after copy
- [ ] 2.2 Write a failing unit test asserting that non-ignored files are still copied to the destination with their relative paths preserved
- [ ] 2.3 Import `DEFAULT_IGNORE` and `path` in `packages/core/src/install.ts`
- [ ] 2.4 Add `filter: (_src) => !DEFAULT_IGNORE.has(path.basename(_src))` to the `fs.cp` call in `copyTree()`
- [ ] 2.5 Confirm all new and existing install tests pass

## 3. Add files allowlist to scaffold (test-first)

- [ ] 3.1 Write a failing unit test for `executeScaffold()` asserting that `npm pkg set files[]=bin` and `npm pkg set files[]=${config.skillDir}` are executed in the command sequence
- [ ] 3.2 Write a failing test asserting that the resulting `package.json` `files` field contains `"bin"` and the configured skill content path
- [ ] 3.3 Add `npm pkg set files[]=bin` and `npm pkg set files[]=${config.skillDir}` to the npm command sequence in `packages/create/src/scaffold.ts` `executeScaffold()`
- [ ] 3.4 Confirm all new and existing scaffold tests pass

## 4. Add publish preview to wizard (test-first)

- [ ] 4.1 Write a failing test for the NPM preview step in `run.ts` asserting that skill directory contents are listed before the confirmation prompt
- [ ] 4.2 Write a failing test asserting that entries matching the ignore set are noted as excluded in the preview output
- [ ] 4.3 Write a failing test asserting that the preview handles a missing skill directory gracefully (no error, prints a note)
- [ ] 4.4 Implement the file tree preview in `packages/create/src/run.ts` Step 5 (NPM preview), reading skill directory contents and annotating excluded entries
- [ ] 4.5 Confirm all new and existing wizard tests pass

## 5. Integration verification

- [ ] 5.1 Run the full test suite (`pnpm test`) and confirm all tests pass
- [ ] 5.2 Manually verify install: install a skill whose source directory contains `.git/` and confirm it is absent from the installed location
- [ ] 5.3 Manually verify scaffold: run `create-skillet` in a temp directory and confirm the generated `package.json` contains the expected `files` field
