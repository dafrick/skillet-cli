## 1. Extract shared UI into packages/ui

- [ ] 1.1 Create `packages/ui/` directory with `package.json` (`name: @skillet-cli/ui`, `private: true`, `type: module`, `engines.node: >=24`), `tsconfig.json`, and `vitest.config.ts` mirroring `packages/core` toolchain
- [ ] 1.2 Copy `colors.ts`, `spinner.ts`, and `wordmark.ts` from `packages/core/src/ui/` into `packages/ui/src/` — remove any core-specific content (static `ART_LINES` / `renderWordmark()` stays in core)
- [ ] 1.3 Refactor `header.ts` into `packages/ui/src/header.ts` with `attributionLine: string` as a required parameter instead of hardcoding the core attribution string
- [ ] 1.4 Add `packages/ui/src/index.ts` exporting all public symbols (`colors`, `spinner`, `wordmark`, `header`)
- [ ] 1.5 Add `@skillet-cli/ui` as a `workspace:*` dependency in `packages/core/package.json`
- [ ] 1.6 Update all `packages/core/src/ui/colors.js`, `/spinner.js`, `/wordmark.js`, `/header.js` import paths to `@skillet-cli/ui` — `verbs.ts` and `taglines.ts` remain at their local paths
- [ ] 1.7 Update `packages/core/src/ui/header.ts` (now a thin wrapper) to pass the core attribution string into the shared `renderFullHeader`/`renderLightHeader`
- [ ] 1.8 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test` — confirm all tests pass with migrated imports

## 2. Create packages/create scaffold

- [ ] 2.1 Create `packages/create/package.json`: `name: create-skillet`, `type: module`, `engines.node: >=24`, `bin: { "create-skillet": "./bin/cli.js" }`, dependencies on `@skillet-cli/ui workspace:*`, `@inquirer/prompts`, `chalk`, `commander`, `figlet`
- [ ] 2.2 Create `packages/create/tsconfig.json` and `packages/create/vitest.config.ts` mirroring `packages/core`
- [ ] 2.3 Create `packages/create/bin/cli.js` with shebang importing and calling `run()` from `../dist/run.js`
- [ ] 2.4 Create `packages/create/src/run.ts` as the main entry point — Commander program setup, `prepublishOnly` build script in `package.json`

## 3. Implement detection module

- [ ] 3.1 Create `packages/create/src/detect.ts` with `detectEnvironment()`: checks for `package.json`, `skill/` subfolder, `SKILL.md` in root, runs `git remote get-url origin` (normalize to `git+https://`), runs `git config user.name` and `git config user.email` — all git calls swallow errors
- [ ] 3.2 In `detectEnvironment()`, read existing `package.json` fields (`name`, `version`, `author`, `description`) when present and include them in the returned detection result for use as prompt defaults
- [ ] 3.3 Write unit tests for `detect.ts` covering: git remote normalization, graceful failure on non-git dirs, existing `package.json` field extraction

## 4. Implement prompts module

- [ ] 4.1 Create `packages/create/src/prompts.ts` with `collectConfig(detected)`: runs prompts in order — package name, version, description, author, repository URL, license, skill content path — each pre-filled from detection result
- [ ] 4.2 Implement the early gate confirm in `run.ts` before `collectConfig` is called — print the intent statement and `select` confirm; on "no" print manual instructions and `process.exit(0)`
- [ ] 4.3 Implement the preview + confirm step after `collectConfig` returns — render summary table, ask for final confirmation; on "no" `process.exit(0)`

## 5. Implement skill directory setup

- [ ] 5.1 Create `packages/create/src/skill-dir.ts` with `setupSkillDir(detected)`: skips if `skill/` exists; if `SKILL.md` is in root and ≤12 items, show `checkbox` with pre-selection logic; if >12 items, show single `confirm`
- [ ] 5.2 Define pre-selection logic: always pre-select `SKILL.md`; pre-select any folder named `resources`, `assets`, or `templates`; never pre-select `README.md`, dotfiles, lock files, or dot-folders
- [ ] 5.3 Execute the move: `mkdir skill/ && mv <selected> skill/` for each selected item; print which files were moved
- [ ] 5.4 Write unit tests for pre-selection logic covering: standard case, >12 items threshold, `skill/` already exists

## 6. Implement scaffold execution module

- [ ] 6.1 Create `packages/create/src/scaffold.ts` with `executeScaffold(config)`: runs `npm init -y` if no `package.json` exists, then runs `npm pkg set` for each config field (name, version, description, author, license, type=module, repository.type, repository.url, repository.directory, bin entry)
- [ ] 6.2 In `scaffold.ts`, write `bin/cli.js` from a template string: shebang, ESM imports of `createRequire`/`fileURLToPath`, `import { run } from '@skillet-cli/core'`, `run({ skillDir: fileURLToPath(new URL('../<skillPath>', import.meta.url)), pkg })`
- [ ] 6.3 In `scaffold.ts`, run `chmod 755 bin/cli.js` after writing the file
- [ ] 6.4 In `scaffold.ts`, run `npm install @skillet-cli/core` as the final step
- [ ] 6.5 Wrap each scaffold step in a spinner using the shared `createSpinner` from `@skillet-cli/ui`; use cooking verbs (`Prepping`, `Seasoning`, `Plating`, `Firing up`) for TTY output

## 7. Implement wizard header and UX

- [ ] 7.1 Create `packages/create/src/ui/header.ts`: call `generateWordmark('SKILLETIZE')` from `@skillet-cli/ui`; compose tagline and attribution line (`Powered by Skillet CLI v{version}` + OSC8 link); suppress in non-TTY/CI
- [ ] 7.2 Render the header at the start of `run()`, before the early gate prompt
- [ ] 7.3 After all scaffold steps complete, print the completion block: elapsed time, "Your skill package is ready.", labeled next steps (`npx . install`, `npm publish`)

## 8. Add cross-promotion hint to packages/core

- [ ] 8.1 In `packages/core/src/run.ts`, after the install success summary (TTY only), check whether `create-skillet` is present: run `npm list -g create-skillet --json` or check for the binary via `which create-skillet`; if absent, print a single dim line: `Tip: publish your own skill — npm create skillet`
- [ ] 8.2 Suppress the hint in non-TTY and CI environments; ensure it does not appear in the `update`, `uninstall`, or `list` commands

## 9. Build tooling and CI

- [ ] 9.1 Add Makefile targets for `packages/create`: `build`, `typecheck`, `test`, `publish` — mirroring existing `packages/core` targets
- [ ] 9.2 Add Makefile targets for `packages/ui`: `build`, `typecheck`, `test`
- [ ] 9.3 Update root `Makefile` or CI matrix to build `packages/ui` before `packages/core` and `packages/create`
- [ ] 9.4 Run full workspace test suite (`pnpm -r test`) and confirm all packages pass

## 10. Verify

- [ ] 10.1 Run `pnpm --filter @skillet-cli/ui build && pnpm --filter @skillet-cli/ui test` — confirm UI package builds and tests pass
- [ ] 10.2 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test` — confirm core still passes with migrated imports
- [ ] 10.3 Run `pnpm --filter create-skillet build` — confirm create package compiles without errors
- [ ] 10.4 Run `npx . install` from a temporary skill directory to confirm the wizard executes end-to-end in a real terminal
- [ ] 10.5 Confirm the SKILLETIZE wordmark renders correctly in TTY and that no output is emitted in `CI=true` mode
