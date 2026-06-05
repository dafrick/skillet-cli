## 1. Extract shared UI into packages/ui

- [x] 1.1 Create `packages/ui/` directory with `package.json`:
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
- [x] 1.2 Copy `colors.ts`, `spinner.ts`, and `wordmark.ts` from `packages/core/src/ui/` into `packages/ui/src/` — remove any core-specific content (static `ART_LINES` / `renderWordmark()` stays in core)
- [x] 1.3 Refactor `header.ts` into `packages/ui/src/header.ts` with `attributionLine: string` as a required parameter instead of hardcoding the core attribution string
- [x] 1.4 Add `packages/ui/src/index.ts` exporting all public symbols (`colors`, `spinner`, `wordmark`, `header`)
- [x] 1.5 Add `@skillet-cli/ui` as a `workspace:*` **devDependency** in `packages/core/package.json` — it is bundled at build time by tsup and does not appear in the published package's runtime dependencies
- [x] 1.6 Add `packages/core/tsup.config.ts` with this exact config — every field is required:
  ```ts
  import { defineConfig } from 'tsup';
  export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    outDir: 'dist',
    noExternal: ['@skillet-cli/ui'],
  });
  ```
  Replace the existing `tsc` build step in `packages/core/package.json` scripts (`"build": "tsc"`) with `"build": "tsup"`. The `entry`, `format`, and `dts` fields are required to match the existing `"exports": { ".": "./dist/index.js" }` in packages/core/package.json — tsup must produce `dist/index.js` (ESM) and `dist/index.d.ts` to satisfy existing consumers.
- [x] 1.7 Update all `packages/core/src/ui/colors.js`, `/spinner.js`, `/wordmark.js`, `/header.js` import paths to `@skillet-cli/ui` — `verbs.ts` and `taglines.ts` remain at their local paths
- [x] 1.8 Update `packages/core/src/ui/header.ts` (now a thin wrapper) to pass the core attribution string into the shared `renderFullHeader`/`renderLightHeader`
- [x] 1.9 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test` — confirm all tests pass with migrated imports
- [x] 1.10 Write unit tests for `packages/ui/src/colors.ts`: import `{ ember500, irisBright, basil, dim }` from the compiled package → assert each is a function (chalk color instance) and does not throw when called with a string
- [x] 1.11 Write unit tests for `packages/ui/src/spinner.ts`:
  - TTY spinner (`createSpinner(true)`): call `start('label')` then `succeed('done')` — assert `process.stdout.write` was called and the final write does NOT contain ANSI escape sequences on the success line (or assert the exact ANSI clear sequence was emitted)
  - Non-TTY spinner (`createSpinner(false)`): call `succeed('done')` — assert stdout received `'done\n'` with no ANSI escape codes
- [x] 1.12 Write unit tests for `packages/ui/src/wordmark.ts`:
  - `deriveDisplayName('@skillet-cli/core')` → `'CORE'`
  - `deriveDisplayName('create-skillet')` → `'CREATE-SKILLET'`
  - `generateWordmark('CORE')` with `process.stdout.columns` set to 10 (too narrow for figlet) → returns a plain ember-bold string, not figlet art
  - `generateWordmark('CORE')` with `process.stdout.columns` set to 200 → returns a string containing ANSI color codes (figlet rendered)
- [x] 1.13 Write unit tests for `packages/ui/src/header.ts`:
  - `renderFullHeader({ wordmark: 'W', tagline: 'T', attributionLine: 'A' })` in TTY (mock `process.stdout.isTTY = true`, `process.env.CI` unset) → returned string contains `'A'`
  - Same call with `process.env.CI = 'true'` → returns `''`
  - `renderLightHeader({ ... , attributionLine: 'X' })` in TTY → returned string contains `'X'`

## 2. Create packages/create scaffold

- [x] 2.1 Create `packages/create/package.json`: `name: create-skillet`, `type: module`, `engines.node: >=24`, `bin: { "create-skillet": "./bin/cli.js" }`, devDependency on `@skillet-cli/ui workspace:*` (bundled by tsup), runtime dependencies on `@inquirer/prompts`, `chalk`, `commander`
- [x] 2.2 Create `packages/create/tsconfig.json` and `packages/create/vitest.config.ts` mirroring `packages/core`
- [x] 2.3 Create `packages/create/tsup.config.ts` with `noExternal: ['@skillet-cli/ui']` to bundle the UI package into the create package's dist output
- [x] 2.4 Create `packages/create/bin/cli.js` with shebang importing and calling `run()` from `../dist/run.js`
- [x] 2.5 Create `packages/create/src/run.ts` as the main entry point. Set up a minimal Commander program:
  ```ts
  program
    .name('create-skillet')
    .description('Convert a skill directory into a publishable npm package')
    .argument('[name]', 'optional package name — overrides the directory-name default')
    .action(async (nameArg?: string) => { /* wizard flow */ });
  ```
  Pass `nameArg` to `detectEnvironment()` so it can use it as the `name` field in `DetectionResult` when present. Add `prepublishOnly: "npm run build"` to `packages/create/package.json` scripts.

## 3. Implement detection module

- [x] 3.1 Create `packages/create/src/detect.ts` with `detectEnvironment(): DetectionResult`. The function checks the current directory and returns:
  ```ts
  interface DetectionResult {
    cwd: string;                  // absolute path from process.cwd()
    name: string;                 // from existing package.json `name`, or kebab-case(path.basename(cwd))
    hasPackageJson: boolean;
    hasSkillMd: boolean;          // SKILL.md exists in cwd root (not inside skill/)
    skillDir: string | null;      // 'skill/' if skill/ subfolder exists, or existing skillet.skillDir value, else null
    repositoryUrl: string;        // normalized git+https:// URL, or empty string
    gitUser: string;              // 'Name <email>' format, or empty string
  }
  ```
  Kebab-case conversion: lowercase, replace spaces/underscores/dots with hyphens, strip any character not in `[a-z0-9-]`, collapse consecutive hyphens. All git subprocess calls (`git remote get-url origin`, `git config user.name`, `git config user.email`) swallow errors and return empty string on failure.
- [x] 3.2 In `detectEnvironment()`, when `package.json` exists: read `name`, `version`, `author`, `description` from it for prompt defaults; read `skillet.skillDir` and use it as `skillDir` in the result (taking precedence over the detected `skill/` subfolder). When `package.json` is absent: derive `name` from `path.basename(process.cwd())` via the kebab-case conversion defined in task 3.1; leave `version`, `author`, `description` empty.
- [x] 3.3 Write unit tests for `detect.ts` covering:
  - Git remote normalization: SSH `git@github.com:org/repo.git` → `git+https://github.com/org/repo.git`; already-HTTPS `https://github.com/org/repo` → `git+https://github.com/org/repo`; `.git` suffix stripped
  - Graceful failure: `git remote get-url origin` exits non-zero → `repositoryUrl: ''`
  - Existing `package.json`: reads `name`, `version`, `author`, `description`, `skillet.skillDir` → used as prompt defaults; `skillDir` comes from `skillet.skillDir`, not from filesystem check
  - No `package.json`: `name` is kebab-case of directory name (e.g., `'My Skill'` → `'my-skill'`, `'.config'` → `'config'`, `'My_Skill_v2'` → `'my-skill-v2'`)
  - `skill/` subfolder present, no `package.json`: `skillDir: 'skill/'`
- [x] 3.4 Create `packages/create/test/helpers/sandbox.ts` — a test helper that:
  1. Creates a fresh temp directory via `fs.mkdtemp`
  2. Optionally pre-populates it with a given file set (e.g., a `SKILL.md` file, a `skill/` subfolder)
  3. Returns `{ dir, cleanup }` where `cleanup()` removes the temp directory
  Mirror the shape of `packages/core/test/integration/helpers/sandbox.ts`. This is used by scaffold and skill-dir integration tests.

## 4. Implement NPM setup phase (prompts + preview)

- [x] 4.1 Create `packages/create/src/prompts.ts` with `collectConfig(detected)`: runs prompts in order — package name, version, description, author, repository URL, license, skill content path — each pre-filled from detection result
- [x] 4.2 Implement the early gate in `run.ts` before `collectConfig` is called — display detection summary (absolute cwd path, SKILL.md found/not found, package.json found/not found, detected git user or "(not detected)"), then prompt to confirm; on "no" print manual instructions and `process.exit(0)`
- [x] 4.3 Implement the NPM preview + confirm step after `collectConfig` returns — render summary table of fields and npm commands to run, ask for final confirmation; on "no" print "No changes made. Re-run `create-skillet` to start over." and `process.exit(0)`

## 5. Implement scaffold execution module

- [x] 5.1 Create `packages/create/src/scaffold.ts` with `executeScaffold(config)`: runs `npm init -y` if no `package.json` exists, then runs `npm pkg set` for each config field (name, version, description, author, license, type=module, `engines.node='>=24'`, `skillet.skillDir`, bin entry). Run `npm pkg set repository.type=git` and `npm pkg set repository.url=<value>` **only when `config.repositoryUrl` is non-empty**; skip both repository fields entirely when the user left the URL blank.
- [x] 5.2 In `scaffold.ts`, write `bin/cli.js` by interpolating `config.skillDir` into a template string before writing:
  ```js
  #!/usr/bin/env node
  import { createRequire } from 'node:module';
  import { fileURLToPath } from 'node:url';
  import { run } from '@skillet-cli/core';

  const pkg = createRequire(import.meta.url)('../package.json');
  await run({ skillDir: fileURLToPath(new URL('../skill/', import.meta.url)), pkg });
  ```
  Replace `skill/` with `config.skillDir` at template-write time (i.e., use a JS template literal: `` `...new URL('../${config.skillDir}', import.meta.url)...` ``). `config.skillDir` is the skill content path value from `collectConfig`.
- [x] 5.3 In `scaffold.ts`, run `chmod 755 bin/cli.js` after writing the file
- [x] 5.4 In `scaffold.ts`, run `npm install @skillet-cli/core` as the final step
- [x] 5.5 Wrap each scaffold step in a spinner using the shared `createSpinner` from `@skillet-cli/ui`; use cooking verbs (`Prepping`, `Seasoning`, `Plating`, `Firing up`) for TTY output
- [x] 5.6 In `scaffold.ts`, wrap the full `executeScaffold` body in a try/catch. On any thrown error, print to stderr: `Error during setup: <step-name> failed — <error.message>`. Then `process.exit(1)`. Do the same for the npm install step in task 5.4 — check the subprocess exit code explicitly rather than relying on thrown errors, since `execa`/`child_process.exec` may not throw on non-zero exit.
- [x] 5.7 Write unit and integration tests for `scaffold.ts`:
  - **Unit — npm init conditional**: mock `fs.existsSync` to return false → assert `npm init -y` is called; return true → assert it is skipped
  - **Unit — npm pkg set fields**: call `executeScaffold` with a full config object → assert `npm pkg set` is called for each required field (name, version, description, author, license, type, engines.node, skillet.skillDir, bin)
  - **Unit — repository URL guard**: config with empty `repositoryUrl` → assert `npm pkg set repository.url` is NOT called
  - **Integration — bin/cli.js written**: using sandbox from task 3.4, run `executeScaffold` with `skillDir: 'skill/'` → read `bin/cli.js` → assert it contains `new URL('../skill/', import.meta.url)` (the interpolated value, not a placeholder)
  - **Integration — bin/cli.js chmod**: assert `bin/cli.js` stat mode includes execute bits (`(stat.mode & 0o111) !== 0`)

## 6. Implement skill directory setup (skilletize phase)

- [x] 6.1 Create `packages/create/src/skill-dir.ts` with `setupSkillDir(detected)`: skips if `skill/` exists (prints a single line noting skill/ was found); if `SKILL.md` is in root and ≤12 items, show `checkbox` with pre-selection logic; if >12 items, show single `confirm`
- [x] 6.2 Define pre-selection logic: always pre-select `SKILL.md`; pre-select any folder named `resources`, `assets`, or `templates`; never pre-select `README.md`, dotfiles, lock files, or dot-folders
- [x] 6.3 In the >12 items path, detect which skill-related directories are present but will be skipped (folders matching `resources`, `assets`, `templates` beyond `resources/`); include their names explicitly in the confirm prompt message
- [x] 6.4 After selection, show a skilletize preview listing exactly which files and folders will be moved and ask for final confirmation; on "no" print "No files moved. Your npm package is set up." and `process.exit(0)`
- [x] 6.5 Execute the move: create `skill/` then move each selected item into it; print which files were moved
- [x] 6.6 Write unit tests for pre-selection logic covering: standard case, >12 items threshold, `skill/` already exists, >12 items with multiple skill-related dirs present
- [x] 6.7 In `skill-dir.ts`, wrap each `fs.rename` call in a try/catch. On failure: print to stderr which file failed and the error message, then `process.exit(1)`. Do not attempt to roll back already-moved files.

## 7. Implement wizard header and UX

- [x] 7.1 In `packages/create/src/run.ts`, after calling `detectEnvironment()` and before the early gate, compose and print the header directly using `@skillet-cli/ui` exports:
  - Call `renderFullHeader({ wordmark: generateWordmark('SKILLETIZE'), tagline: \`Package ${detected.name} for any AI agent\`, attributionLine: \`Powered by Skillet CLI v${pkg.version}\` })`. Since `detected.name` is always a non-empty string (kebab-case directory name at minimum, per task 3.1), the generic fallback is only needed if `detected.name` is unexpectedly empty: `detected.name || 'your skill'`.
  - Do **not** create a separate `packages/create/src/ui/header.ts` wrapper file — call `renderFullHeader` from `@skillet-cli/ui` directly in `run.ts`. The extra indirection layer adds no value.
  - Suppress in non-TTY/CI: `renderFullHeader` already returns empty string in those environments (per shared-ui/spec.md).
- [x] 7.2 Call `detectEnvironment()` first in `run()`, then render the header (per task 7.1) using the detection result, then proceed to the early gate (task 4.2). The header uses `detected.name` so the tagline always shows a real name — no re-render is needed after `collectConfig` because the name was available from detection.
- [x] 7.3 After all steps complete, print the completion block: elapsed time, "Your skill package is ready.", labeled next steps (`npx . install`, `npm publish`)

## 8. Add cross-promotion hint to packages/core

- [x] 8.1 In `packages/core/src/run.ts`, after the install success summary (TTY only), check whether `create-skillet` is present via `which create-skillet`; if the command returns non-zero, print a single dim line: `Tip: publish your own skill — npm create skillet`
- [x] 8.2 Suppress the hint in non-TTY and CI environments; ensure it does not appear in the `update`, `uninstall`, or `list` commands

## 9. Build tooling and CI

- [x] 9.1 Add `scripts` to `packages/create/package.json` (`build: tsup`, `typecheck: tsc --noEmit`, `test: vitest run`, `test:unit`, `test:integration`, `test:e2e`, `prepublishOnly: pnpm build && pnpm test`) and `packages/ui/package.json` (`build: tsc`, `typecheck: tsc --noEmit`, `test: vitest run`) — mirroring the shape of `packages/core/package.json` scripts. Update root `package.json` scripts to include all three packages in the right build order:
  - `build`: `pnpm --filter @skillet-cli/ui build && pnpm --filter @skillet-cli/core build && pnpm --filter create-skillet build`
  - `typecheck`: `pnpm -r typecheck`
  - `test:unit`: `pnpm -r test:unit`
  - `test:integration`: `pnpm --filter @skillet-cli/core test:integration && pnpm --filter create-skillet test:integration`
  - `test:e2e`: `pnpm --filter @skillet-cli/core test:e2e && pnpm --filter create-skillet test:e2e`

- [x] 9.2 Update `.github/workflows/ci.yml` with per-package path-filtered jobs. Add a `changes` job using `dorny/paths-filter@v3` at the top that outputs which packages were affected:
  ```yaml
  changes:
    runs-on: ubuntu-latest
    outputs:
      ui: ${{ steps.filter.outputs.ui }}
      core: ${{ steps.filter.outputs.core }}
      create: ${{ steps.filter.outputs.create }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            ui:
              - 'packages/ui/**'
            core:
              - 'packages/core/**'
              - 'packages/ui/**'
            create:
              - 'packages/create/**'
              - 'packages/ui/**'
  ```
  Gate each existing test job (`unit`, `integration`, `e2e`) with `needs: [changes]` and a conditional — e.g., `if: needs.changes.outputs.core == 'true' || needs.changes.outputs.create == 'true'`. Add a build step (`pnpm --filter @skillet-cli/ui build`) before running tests in the `core` and `create` jobs, since both packages require the compiled `packages/ui` dist. The `quality` job (lint/typecheck) runs unconditionally on every push.

- [x] 9.3 Add tagging convention to `design.md` under a new `### Decision: Package-prefixed release tags` section:
  - `core-v<semver>` tags release `@skillet-cli/core` (e.g. `core-v1.2.3`)
  - `create-v<semver>` tags release `create-skillet` (e.g. `create-v0.1.0`)
  - `packages/ui` is private and never tagged or published independently

- [x] 9.4 Split `.github/workflows/release.yml` into two workflows:
  - `release-core.yml` — mirrors existing `release.yml` but: triggers on `workflow_run: [CI]` where `head_branch` starts with `core-v`; validates `^core-v[0-9]+\.[0-9]+\.[0-9]+$`; runs `pnpm --filter @skillet-cli/ui build` before `pnpm -F @skillet-cli/core publish`
  - `release-create.yml` — same pattern: `head_branch` starts with `create-v`; validates `^create-v[0-9]+\.[0-9]+\.[0-9]+$`; runs `pnpm --filter @skillet-cli/ui build` then `pnpm -F create-skillet publish --access public --no-git-checks`
  - Delete the original `release.yml`

- [x] 9.5 Run full workspace build and test suite to confirm all packages pass before marking this section complete:
  ```
  pnpm --filter @skillet-cli/ui build && pnpm --filter @skillet-cli/ui test
  pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test
  pnpm --filter create-skillet build && pnpm --filter create-skillet test
  ```

## 10. Verify

- [x] 10.1 Run `pnpm --filter @skillet-cli/ui build && pnpm --filter @skillet-cli/ui test` — confirm UI package builds and tests pass
- [x] 10.2 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test` — confirm core still passes with migrated imports and tsup bundling
- [x] 10.3 Run `pnpm --filter create-skillet build` — confirm create package compiles without errors
- [x] 10.4 Create `packages/create/test/e2e/wizard.test.ts` — an automated e2e test that:
  1. Creates a temp directory with a `SKILL.md` file using the sandbox helper
  2. Spawns `create-skillet` as a subprocess (from the built dist) using `@inquirer/prompts`-compatible stdin piping or by pre-seeding all prompts via CLI args if supported
  3. Asserts: process exits 0, `package.json` exists with required fields, `bin/cli.js` exists and is executable, `skill/SKILL.md` exists (moved from root)
  Mirror the pattern in `packages/core/test/e2e/install.test.ts` and `packages/core/test/e2e/globalSetup.ts`. Run as part of `pnpm --filter create-skillet test:e2e` (separate vitest config).
  **Note:** If fully automated e2e is not feasible for the interactive wizard (stdin piping to @inquirer/prompts is non-trivial), document the limitation and keep this as a documented manual step — but create the test file scaffold so future automation can be added.
- [x] 10.5 Confirm the SKILLETIZE wordmark renders correctly in TTY and that no output is emitted in `CI=true` mode
