## 1. Extract shared UI into packages/ui

- [ ] 1.1 Create `packages/ui/` directory with `package.json`:
  ```json
  {
    "name": "@skillet-cli/ui",
    "private": true,
    "type": "module",
    "main": "./dist/index.js",
    "exports": { ".": "./dist/index.js" },
    "engines": { "node": ">=24" }
  }
  ```
  Add `tsconfig.json` (with `"outDir": "dist"` and `"declaration": true`) and `vitest.config.ts` mirroring `packages/core` toolchain. The `exports` and `main` fields are required so that tsup can resolve the package entry point when bundling it via `noExternal: ['@skillet-cli/ui']` in consuming packages.
- [ ] 1.2 Copy `colors.ts`, `spinner.ts`, and `wordmark.ts` from `packages/core/src/ui/` into `packages/ui/src/` — remove any core-specific content (static `ART_LINES` / `renderWordmark()` stays in core)
- [ ] 1.3 Refactor `header.ts` into `packages/ui/src/header.ts` with `attributionLine: string` as a required parameter instead of hardcoding the core attribution string
- [ ] 1.4 Add `packages/ui/src/index.ts` exporting all public symbols (`colors`, `spinner`, `wordmark`, `header`)
- [ ] 1.5 Add `@skillet-cli/ui` as a `workspace:*` **devDependency** in `packages/core/package.json` — it is bundled at build time by tsup and does not appear in the published package's runtime dependencies
- [ ] 1.6 Add `tsup.config.ts` to `packages/core` with `noExternal: ['@skillet-cli/ui']` so that `@skillet-cli/ui` is inlined into `packages/core/dist/` at build time; replace the existing `tsc` build step with `tsup`
- [ ] 1.7 Update all `packages/core/src/ui/colors.js`, `/spinner.js`, `/wordmark.js`, `/header.js` import paths to `@skillet-cli/ui` — `verbs.ts` and `taglines.ts` remain at their local paths
- [ ] 1.8 Update `packages/core/src/ui/header.ts` (now a thin wrapper) to pass the core attribution string into the shared `renderFullHeader`/`renderLightHeader`
- [ ] 1.9 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test` — confirm all tests pass with migrated imports

## 2. Create packages/create scaffold

- [ ] 2.1 Create `packages/create/package.json`: `name: create-skillet`, `type: module`, `engines.node: >=24`, `bin: { "create-skillet": "./bin/cli.js" }`, devDependency on `@skillet-cli/ui workspace:*` (bundled by tsup), runtime dependencies on `@inquirer/prompts`, `chalk`, `commander`
- [ ] 2.2 Create `packages/create/tsconfig.json` and `packages/create/vitest.config.ts` mirroring `packages/core`
- [ ] 2.3 Create `packages/create/tsup.config.ts` with `noExternal: ['@skillet-cli/ui']` to bundle the UI package into the create package's dist output
- [ ] 2.4 Create `packages/create/bin/cli.js` with shebang importing and calling `run()` from `../dist/run.js`
- [ ] 2.5 Create `packages/create/src/run.ts` as the main entry point — Commander program setup, `prepublishOnly` build script in `package.json`

## 3. Implement detection module

- [ ] 3.1 Create `packages/create/src/detect.ts` with `detectEnvironment()`: checks for `package.json`, `skill/` subfolder, `SKILL.md` in root, runs `git remote get-url origin` (normalize to `git+https://`), runs `git config user.name` and `git config user.email` — all git calls swallow errors
- [ ] 3.2 In `detectEnvironment()`, read existing `package.json` fields (`name`, `version`, `author`, `description`, `skillet.skillDir`) when present and include them in the returned detection result for use as prompt defaults
- [ ] 3.3 Write unit tests for `detect.ts` covering: git remote normalization, graceful failure on non-git dirs, existing `package.json` field extraction including `skillet.skillDir`

## 4. Implement NPM setup phase (prompts + preview)

- [ ] 4.1 Create `packages/create/src/prompts.ts` with `collectConfig(detected)`: runs prompts in order — package name, version, description, author, repository URL, license, skill content path — each pre-filled from detection result
- [ ] 4.2 Implement the early gate in `run.ts` before `collectConfig` is called — display detection summary (absolute cwd path, SKILL.md found/not found, package.json found/not found, detected git user or "(not detected)"), then prompt to confirm; on "no" print manual instructions and `process.exit(0)`
- [ ] 4.3 Implement the NPM preview + confirm step after `collectConfig` returns — render summary table of fields and npm commands to run, ask for final confirmation; on "no" print "No changes made. Re-run `create-skillet` to start over." and `process.exit(0)`

## 5. Implement scaffold execution module

- [ ] 5.1 Create `packages/create/src/scaffold.ts` with `executeScaffold(config)`: runs `npm init -y` if no `package.json` exists, then runs `npm pkg set` for each config field (name, version, description, author, license, type=module, `engines.node='>=24'`, repository.type, repository.url, `skillet.skillDir`, bin entry)
- [ ] 5.2 In `scaffold.ts`, write `bin/cli.js` by interpolating `config.skillDir` into a template string before writing:
  ```js
  #!/usr/bin/env node
  import { createRequire } from 'node:module';
  import { fileURLToPath } from 'node:url';
  import { run } from '@skillet-cli/core';

  const pkg = createRequire(import.meta.url)('../package.json');
  await run({ skillDir: fileURLToPath(new URL('../skill/', import.meta.url)), pkg });
  ```
  Replace `skill/` with `config.skillDir` at template-write time (i.e., use a JS template literal: `` `...new URL('../${config.skillDir}', import.meta.url)...` ``). `config.skillDir` is the skill content path value from `collectConfig`.
- [ ] 5.3 In `scaffold.ts`, run `chmod 755 bin/cli.js` after writing the file
- [ ] 5.4 In `scaffold.ts`, run `npm install @skillet-cli/core` as the final step
- [ ] 5.5 Wrap each scaffold step in a spinner using the shared `createSpinner` from `@skillet-cli/ui`; use cooking verbs (`Prepping`, `Seasoning`, `Plating`, `Firing up`) for TTY output

## 6. Implement skill directory setup (skilletize phase)

- [ ] 6.1 Create `packages/create/src/skill-dir.ts` with `setupSkillDir(detected)`: skips if `skill/` exists (prints a single line noting skill/ was found); if `SKILL.md` is in root and ≤12 items, show `checkbox` with pre-selection logic; if >12 items, show single `confirm`
- [ ] 6.2 Define pre-selection logic: always pre-select `SKILL.md`; pre-select any folder named `resources`, `assets`, or `templates`; never pre-select `README.md`, dotfiles, lock files, or dot-folders
- [ ] 6.3 In the >12 items path, detect which skill-related directories are present but will be skipped (folders matching `resources`, `assets`, `templates` beyond `resources/`); include their names explicitly in the confirm prompt message
- [ ] 6.4 After selection, show a skilletize preview listing exactly which files and folders will be moved and ask for final confirmation; on "no" print "No files moved. Your npm package is set up." and `process.exit(0)`
- [ ] 6.5 Execute the move: create `skill/` then move each selected item into it; print which files were moved
- [ ] 6.6 Write unit tests for pre-selection logic covering: standard case, >12 items threshold, `skill/` already exists, >12 items with multiple skill-related dirs present

## 7. Implement wizard header and UX

- [ ] 7.1 Create `packages/create/src/ui/header.ts`: call `generateWordmark('SKILLETIZE')` from `@skillet-cli/ui`; compose tagline (`Package <name> for any AI agent`, falling back to `Package your skill for any AI agent`) and attribution line (`Powered by Skillet CLI v{version}` + OSC8 link); suppress in non-TTY/CI
- [ ] 7.2 Render the header at the start of `run()`, before the early gate prompt
- [ ] 7.3 After all steps complete, print the completion block: elapsed time, "Your skill package is ready.", labeled next steps (`npx . install`, `npm publish`)

## 8. Add cross-promotion hint to packages/core

- [ ] 8.1 In `packages/core/src/run.ts`, after the install success summary (TTY only), check whether `create-skillet` is present via `which create-skillet`; if the command returns non-zero, print a single dim line: `Tip: publish your own skill — npm create skillet`
- [ ] 8.2 Suppress the hint in non-TTY and CI environments; ensure it does not appear in the `update`, `uninstall`, or `list` commands

## 9. Build tooling and CI

- [ ] 9.1 Add Makefile targets for `packages/create`: `build` (tsup), `typecheck` (tsc --noEmit), `test`, `publish` — mirroring existing `packages/core` targets
- [ ] 9.2 Add Makefile targets for `packages/ui`: `build` (tsc), `typecheck`, `test`
- [ ] 9.3 Update root `Makefile` or CI matrix to build `packages/ui` before `packages/core` and `packages/create`
- [ ] 9.4 Run full workspace test suite (`pnpm -r test`) and confirm all packages pass

## 10. Verify

- [ ] 10.1 Run `pnpm --filter @skillet-cli/ui build && pnpm --filter @skillet-cli/ui test` — confirm UI package builds and tests pass
- [ ] 10.2 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test` — confirm core still passes with migrated imports and tsup bundling
- [ ] 10.3 Run `pnpm --filter create-skillet build` — confirm create package compiles without errors
- [ ] 10.4 Run `npx . install` from a temporary skill directory to confirm the wizard executes end-to-end in a real terminal
- [ ] 10.5 Confirm the SKILLETIZE wordmark renders correctly in TTY and that no output is emitted in `CI=true` mode
