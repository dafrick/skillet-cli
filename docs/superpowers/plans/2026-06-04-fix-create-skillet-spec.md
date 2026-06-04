# Fix create-skillet Spec Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 10 verified gaps in the `create-skillet` change documents (design.md, specs, tasks.md) covering broken template placeholders, missing type contracts, missing test tasks, underspecified build config, and unhandled UX flows.

**Architecture:** All changes are to spec documents under `openspec/changes/create-skillet/`. No implementation code exists yet. Each task edits one or two files with exact replacement text, then verifies the gap is closed by re-reading the edited section.

**Tech Stack:** Markdown spec documents (OpenSpec format). No build tools required.

---

## Files in Scope

| File | Findings addressed |
|------|--------------------|
| `openspec/changes/create-skillet/tasks.md` | All 10 findings — primary target |
| `openspec/changes/create-skillet/design.md` | Findings 2, 5, 8, 10 |
| `openspec/changes/create-skillet/specs/skilletize-wizard/spec.md` | Findings 3, 4, 7, 9, 10 |
| `openspec/changes/create-skillet/specs/shared-ui/spec.md` | Finding 6 |
| `openspec/changes/create-skillet/specs/monorepo-setup/spec.md` | Finding 2 |

---

## Task 1: Fix `<skillPath>` literal placeholder

**Finding:** The bin/cli.js template in tasks.md and spec.md uses `<skillPath>` as a literal angle-bracket placeholder. No task says to interpolate it. A developer following the spec literally generates a broken `bin/cli.js`.

**Files:**
- Modify: `openspec/changes/create-skillet/tasks.md` (task 5.2, line ~44)
- Modify: `openspec/changes/create-skillet/specs/skilletize-wizard/spec.md` (scenario line ~93)

- [ ] **Step 1: Fix the template in tasks.md**

In `tasks.md`, replace task 5.2 with:

```markdown
- [ ] 5.2 In `scaffold.ts`, write `bin/cli.js` by interpolating `config.skillDir` into a template string before writing:
  ```js
  #!/usr/bin/env node
  import { createRequire } from 'node:module';
  import { fileURLToPath } from 'node:url';
  import { run } from '@skillet-cli/core';

  const pkg = createRequire(import.meta.url)('../package.json');
  await run({ skillDir: fileURLToPath(new URL('../skill/', import.meta.url)), pkg });
  ```
  Replace `skill/` with `config.skillDir` at template-write time (i.e., use a JS template literal: `\`...new URL('../${config.skillDir}', import.meta.url)...\``). `config.skillDir` is the skill content path value from `collectConfig`.
```

- [ ] **Step 2: Fix the scenario assertion in spec.md**

In `specs/skilletize-wizard/spec.md`, replace the scenario text at line ~93:

Old:
```
- **THEN** `bin/cli.js` exists, starts with `#!/usr/bin/env node`, loads `pkg` via `createRequire(import.meta.url)('../package.json')`, imports `run` from `@skillet-cli/core`, and calls `run({ skillDir: fileURLToPath(new URL('../<skillPath>', import.meta.url)), pkg })`
```

New:
```
- **THEN** `bin/cli.js` exists, starts with `#!/usr/bin/env node`, loads `pkg` via `createRequire(import.meta.url)('../package.json')`, imports `run` from `@skillet-cli/core`, and calls `run({ skillDir: fileURLToPath(new URL('../skill/', import.meta.url)), pkg })` where `skill/` is replaced with the configured skill content path value from the wizard
```

- [ ] **Step 3: Verify**

Re-read tasks.md task 5.2 and spec.md scenario "bin/cli.js is written correctly". Confirm neither contains `<skillPath>` and both describe the interpolation clearly.

---

## Task 2: Add `exports`/`main` field to packages/ui spec

**Finding:** Task 1.1 specifies packages/ui package.json fields (name, private, type, engines) but omits `exports` and `main`. Tsup resolves workspace packages by their `exports` or `main` field. Without it, `pnpm --filter @skillet-cli/core build` will fail.

**Files:**
- Modify: `openspec/changes/create-skillet/tasks.md` (task 1.1)
- Modify: `openspec/changes/create-skillet/specs/monorepo-setup/spec.md` (UI package scenario)
- Modify: `openspec/changes/create-skillet/design.md` (toolchain decision)

- [ ] **Step 1: Update task 1.1 in tasks.md**

Replace task 1.1:

Old:
```
- [ ] 1.1 Create `packages/ui/` directory with `package.json` (`name: @skillet-cli/ui`, `private: true`, `type: module`, `engines.node: >=24`), `tsconfig.json`, and `vitest.config.ts` mirroring `packages/core` toolchain
```

New:
```
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
```

- [ ] **Step 2: Add scenario to monorepo-setup/spec.md**

In `specs/monorepo-setup/spec.md`, append a new scenario under "UI package lives at packages/ui":

```markdown
#### Scenario: UI package exports field is declared
- **WHEN** `packages/ui/package.json` is read
- **THEN** it contains `"exports": { ".": "./dist/index.js" }` and `"main": "./dist/index.js"` pointing at the tsc-compiled output directory
```

- [ ] **Step 3: Note the exports field in design.md**

In `design.md` under the "TypeScript, same toolchain as `packages/core`" decision, append:

```
`packages/ui/package.json` must declare `"exports": { ".": "./dist/index.js" }` and `"main": "./dist/index.js"` so that tsup can resolve it when bundling with `noExternal: ['@skillet-cli/ui']`. Without this, tsup falls back to heuristics and may resolve the wrong entry on a clean checkout.
```

- [ ] **Step 4: Verify**

Confirm task 1.1 now lists all required package.json fields including `exports` and `main`. Confirm the monorepo spec has a scenario for the exports field.

---

## Task 3: Guard empty `repository.url`

**Finding:** Task 5.1 runs `npm pkg set repository.url=<value>` for all fields unconditionally. If the user skips the repository URL prompt, this writes an empty string to package.json, producing a malformed `repository` field. No spec scenario covers this path.

**Files:**
- Modify: `openspec/changes/create-skillet/tasks.md` (task 5.1)
- Modify: `openspec/changes/create-skillet/specs/skilletize-wizard/spec.md` (after "All required fields are set" scenario)

- [ ] **Step 1: Add guard to task 5.1 in tasks.md**

Replace task 5.1:

Old:
```
- [ ] 5.1 Create `packages/create/src/scaffold.ts` with `executeScaffold(config)`: runs `npm init -y` if no `package.json` exists, then runs `npm pkg set` for each config field (name, version, description, author, license, type=module, `engines.node='>=24'`, repository.type, repository.url, `skillet.skillDir`, bin entry)
```

New:
```
- [ ] 5.1 Create `packages/create/src/scaffold.ts` with `executeScaffold(config)`: runs `npm init -y` if no `package.json` exists, then runs `npm pkg set` for each config field (name, version, description, author, license, type=module, `engines.node='>=24'`, `skillet.skillDir`, bin entry). Run `npm pkg set repository.type=git` and `npm pkg set repository.url=<value>` **only when `config.repositoryUrl` is non-empty**; skip both repository fields entirely when the user left the URL blank.
```

- [ ] **Step 2: Add scenario to spec.md**

In `specs/skilletize-wizard/spec.md`, add a new scenario directly after "All required fields are set" (line ~86):

```markdown
#### Scenario: Repository URL left blank
- **WHEN** the user leaves the repository URL prompt empty
- **THEN** the wizard skips `npm pkg set repository.url` and `npm pkg set repository.type` — neither field is written to `package.json`
```

- [ ] **Step 3: Verify**

Re-read tasks.md task 5.1 and confirm it has an explicit conditional guard for the repository URL. Confirm spec.md has a scenario for the blank-URL path.

---

## Task 4: Fix `detectEnvironment()` return shape — path strings, not booleans

**Finding:** Task 3.1 describes detection as checking for the `skill/` subfolder (implying a boolean). The spec requires the skill content path prompt to default to `'skill/'` when the subfolder exists — which requires the detection result to carry the path string, not a boolean. Additionally, the spec requires the package name prompt to default to the "kebab-case form of the current directory name" but no task computes this conversion.

**Files:**
- Modify: `openspec/changes/create-skillet/tasks.md` (tasks 3.1 and 3.2)

- [ ] **Step 1: Rewrite task 3.1 to specify return shape**

Replace task 3.1:

Old:
```
- [ ] 3.1 Create `packages/create/src/detect.ts` with `detectEnvironment()`: checks for `package.json`, `skill/` subfolder, `SKILL.md` in root, runs `git remote get-url origin` (normalize to `git+https://`), runs `git config user.name` and `git config user.email` — all git calls swallow errors
```

New:
```
- [ ] 3.1 Create `packages/create/src/detect.ts` with `detectEnvironment(): DetectionResult`. The function checks the current directory and returns:
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
```

- [ ] **Step 2: Update task 3.2 to use the typed result**

Replace task 3.2:

Old:
```
- [ ] 3.2 In `detectEnvironment()`, read existing `package.json` fields (`name`, `version`, `author`, `description`, `skillet.skillDir`) when present and include them in the returned detection result for use as prompt defaults
```

New:
```
- [ ] 3.2 In `detectEnvironment()`, when `package.json` exists: read `name`, `version`, `author`, `description` from it for prompt defaults; read `skillet.skillDir` and use it as `skillDir` in the result (taking precedence over the detected `skill/` subfolder). When `package.json` is absent: derive `name` from `path.basename(process.cwd())` via the kebab-case conversion defined in task 3.1; leave `version`, `author`, `description` empty.
```

- [ ] **Step 3: Update task 3.3 to cover new shape**

Replace task 3.3:

Old:
```
- [ ] 3.3 Write unit tests for `detect.ts` covering: git remote normalization, graceful failure on non-git dirs, existing `package.json` field extraction including `skillet.skillDir`
```

New:
```
- [ ] 3.3 Write unit tests for `detect.ts` covering:
  - Git remote normalization: SSH `git@github.com:org/repo.git` → `git+https://github.com/org/repo.git`; already-HTTPS `https://github.com/org/repo` → `git+https://github.com/org/repo`; `.git` suffix stripped
  - Graceful failure: `git remote get-url origin` exits non-zero → `repositoryUrl: ''`
  - Existing `package.json`: reads `name`, `version`, `author`, `description`, `skillet.skillDir` → used as prompt defaults; `skillDir` comes from `skillet.skillDir`, not from filesystem check
  - No `package.json`: `name` is kebab-case of directory name (e.g., `'My Skill'` → `'my-skill'`, `'.config'` → `'config'`, `'My_Skill_v2'` → `'my-skill-v2'`)
  - `skill/` subfolder present, no `package.json`: `skillDir: 'skill/'`
```

- [ ] **Step 4: Verify**

Re-read tasks 3.1–3.3. Confirm `DetectionResult` has typed fields (not booleans), kebab-case conversion is specified, and the test task covers SSH URL normalization and directory-name → name derivation.

---

## Task 5: Handle `npm create skillet <name>` positional argument

**Finding:** `npm create skillet my-skill` passes `my-skill` as `process.argv[2]`. Commander is configured (task 2.5) with no defined CLI surface. Either Commander throws on the unexpected argument, or it's silently dropped. The npm create convention expects positional name args to pre-fill the package name.

**Files:**
- Modify: `openspec/changes/create-skillet/design.md` (new decision)
- Modify: `openspec/changes/create-skillet/tasks.md` (task 2.5)
- Modify: `openspec/changes/create-skillet/specs/skilletize-wizard/spec.md` (new scenario)

- [ ] **Step 1: Add decision to design.md**

In `design.md`, append a new `### Decision` section before "Risks / Trade-offs":

```markdown
### Decision: Accept optional `[name]` positional argument

`npm create skillet my-skill` passes `my-skill` as the first positional argument per the npm create convention. The wizard's Commander program defines an optional `[name]` argument. When provided, it overrides the package name prompt default (taking precedence over the kebab-case directory name). When absent, the directory-name-derived default applies.

This is intentionally minimal: no other flags or sub-commands are defined. The `commander` dependency exists solely to handle this convention gracefully rather than throwing "unknown argument".
```

- [ ] **Step 2: Update task 2.5 in tasks.md**

Replace task 2.5:

Old:
```
- [ ] 2.5 Create `packages/create/src/run.ts` as the main entry point — Commander program setup, `prepublishOnly` build script in `package.json`
```

New:
```
- [ ] 2.5 Create `packages/create/src/run.ts` as the main entry point. Set up a minimal Commander program:
  ```ts
  program
    .name('create-skillet')
    .description('Convert a skill directory into a publishable npm package')
    .argument('[name]', 'optional package name — overrides the directory-name default')
    .action(async (nameArg?: string) => { /* wizard flow */ });
  ```
  Pass `nameArg` to `detectEnvironment()` so it can use it as the `name` field in `DetectionResult` when present. Add `prepublishOnly: "npm run build"` to `packages/create/package.json` scripts.
```

- [ ] **Step 3: Add scenario to spec.md**

In `specs/skilletize-wizard/spec.md`, add a new scenario under "Configuration prompts collect package metadata":

```markdown
#### Scenario: Package name supplied as CLI argument
- **WHEN** the user runs `npm create skillet my-cooking-skill`
- **THEN** the package name prompt defaults to `my-cooking-skill`, taking precedence over the kebab-case directory name default
```

- [ ] **Step 4: Verify**

Confirm design.md has an explicit decision for positional arg. Confirm task 2.5 shows the Commander `.argument('[name]', ...)` call. Confirm spec has a scenario for the CLI-name-override path.

---

## Task 6: Specify `packages/core` tsup.config.ts fully

**Finding:** Task 1.6 replaces packages/core's tsc build with tsup specifying only `noExternal`. Entry points, output format, dts generation, and alignment with the existing `exports` map in packages/core are all unspecified. Tsup defaults may diverge from what the existing `exports` map declares.

**Files:**
- Modify: `openspec/changes/create-skillet/design.md` (toolchain decision)
- Modify: `openspec/changes/create-skillet/tasks.md` (task 1.6)

- [ ] **Step 1: Expand the toolchain decision in design.md**

In `design.md`, in the "TypeScript, same toolchain" decision section, append:

```
`packages/core`'s `tsup.config.ts` must explicitly declare `entry: ['src/index.ts']`, `format: ['esm']`, `dts: true`, and `outDir: 'dist'` — matching the existing `exports: { ".": "./dist/index.js" }` in packages/core/package.json. Without explicit format and dts settings, tsup defaults may produce CJS output or omit type declarations, breaking consumers.
```

- [ ] **Step 2: Rewrite task 1.6 with explicit config**

Replace task 1.6:

Old:
```
- [ ] 1.6 Add `tsup.config.ts` to `packages/core` with `noExternal: ['@skillet-cli/ui']` so that `@skillet-cli/ui` is inlined into `packages/core/dist/` at build time; replace the existing `tsc` build step with `tsup`
```

New:
```
- [ ] 1.6 Add `packages/core/tsup.config.ts` with this exact config — every field is required:
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
```

- [ ] **Step 3: Verify**

Re-read task 1.6. Confirm it shows the full tsup.config.ts content with all five fields. Confirm design.md explains why each field is required.

---

## Task 7: Fix dynamic tagline — use detected name from detection result

**Finding:** Task 7.2 renders the header at the start of `run()`, before the early gate. Detection (task 3.1) already runs before the header. The detected `name` field (from existing package.json OR kebab-case directory name, per Task 4) is available at header-render time. The tagline can always show a real name — the generic fallback "your skill" is only needed if detection fails entirely. No task wires `detected.name` into the tagline.

**Files:**
- Modify: `openspec/changes/create-skillet/tasks.md` (tasks 7.1 and 7.2)
- Modify: `openspec/changes/create-skillet/specs/skilletize-wizard/spec.md` (TTY header scenario)

- [ ] **Step 1: Rewrite task 7.1 to use detected.name**

Replace task 7.1:

Old:
```
- [ ] 7.1 Create `packages/create/src/ui/header.ts`: call `generateWordmark('SKILLETIZE')` from `@skillet-cli/ui`; compose tagline (`Package <name> for any AI agent`, falling back to `Package your skill for any AI agent`) and attribution line (`Powered by Skillet CLI v{version}` + OSC8 link); suppress in non-TTY/CI
```

New:
```
- [ ] 7.1 In `packages/create/src/run.ts`, after calling `detectEnvironment()` and before the early gate, compose and print the header directly using `@skillet-cli/ui` exports:
  - Call `renderFullHeader({ wordmark: generateWordmark('SKILLETIZE'), tagline: \`Package ${detected.name} for any AI agent\`, attributionLine: \`Powered by Skillet CLI v${pkg.version}\` })`. Since `detected.name` is always a non-empty string (kebab-case directory name at minimum, per task 3.1), the generic fallback is only needed if `detected.name` is unexpectedly empty: `detected.name || 'your skill'`.
  - Do **not** create a separate `packages/create/src/ui/header.ts` wrapper file — call `renderFullHeader` from `@skillet-cli/ui` directly in `run.ts`. The extra indirection layer adds no value.
  - Suppress in non-TTY/CI: `renderFullHeader` already returns empty string in those environments (per shared-ui/spec.md).
```

- [ ] **Step 2: Simplify task 7.2**

Replace task 7.2:

Old:
```
- [ ] 7.2 Render the header at the start of `run()`, before the early gate prompt
```

New:
```
- [ ] 7.2 Call `detectEnvironment()` first in `run()`, then render the header (per task 7.1) using the detection result, then proceed to the early gate (task 4.2). The header uses `detected.name` so the tagline always shows a real name — no re-render is needed after `collectConfig` because the name was available from detection.
```

- [ ] **Step 3: Update TTY header scenario in spec.md**

In `specs/skilletize-wizard/spec.md`, replace the "TTY header" scenario:

Old:
```
#### Scenario: TTY header
- **WHEN** the wizard runs in a TTY terminal
- **THEN** the ANSI Shadow "SKILLETIZE" wordmark with ember gradient is printed, followed by tagline and attribution
```

New:
```
#### Scenario: TTY header — detected name in tagline
- **WHEN** the wizard runs in a TTY terminal
- **THEN** the ANSI Shadow "SKILLETIZE" wordmark with ember gradient is printed, followed by the tagline `Package <detected-name> for any AI agent` (where `<detected-name>` is the package name from an existing `package.json`, or the kebab-case directory name if no `package.json` exists), followed by the attribution line
```

- [ ] **Step 4: Verify**

Re-read tasks 7.1–7.2. Confirm `detected.name` is used for the tagline. Confirm the separate `src/ui/header.ts` file is no longer created (task 7.1 now calls `renderFullHeader` directly from `@skillet-cli/ui` in `run.ts`). Confirm the TTY header spec scenario verifies the name interpolation.

---

## Task 8: Add error handling requirement and tasks

**Finding:** The spec defines `process.exit(0)` for all user-decline paths but specifies no exit codes or error messages for execution failures. If `npm install @skillet-cli/core` fails, or `chmod` fails, there is no specified behavior — an implementer will either silently exit 0 or let the process crash with an unhandled rejection.

**Files:**
- Modify: `openspec/changes/create-skillet/specs/skilletize-wizard/spec.md` (new requirement)
- Modify: `openspec/changes/create-skillet/tasks.md` (tasks 5 and 6)

- [ ] **Step 1: Add error handling requirement to spec.md**

In `specs/skilletize-wizard/spec.md`, add a new requirement section after "Wizard displays next steps on completion":

```markdown
---

### Requirement: Wizard exits non-zero on execution failure
When any execution step fails (npm init, npm pkg set, bin/cli.js write, chmod, npm install, mkdir, file move), the wizard SHALL print a human-readable error message to stderr describing which step failed and exit with code 1. The wizard SHALL NOT exit with code 0 after a failure.

#### Scenario: npm install fails
- **WHEN** `npm install @skillet-cli/core` exits non-zero
- **THEN** the wizard prints an error message to stderr (e.g., `Error: npm install @skillet-cli/core failed. Run it manually and re-run create-skillet if needed.`) and exits with code 1

#### Scenario: File move fails
- **WHEN** moving a selected file into `skill/` throws a filesystem error
- **THEN** the wizard prints the failed filename and error to stderr and exits with code 1, leaving any already-moved files in their moved location (no rollback)
```

- [ ] **Step 2: Update task 5 to wrap steps in error handling**

In `tasks.md`, append a new sub-task after task 5.5:

```markdown
- [ ] 5.6 In `scaffold.ts`, wrap the full `executeScaffold` body in a try/catch. On any thrown error, print to stderr: `Error during setup: <step-name> failed — <error.message>`. Then `process.exit(1)`. Do the same for the npm install step in task 5.4 — check the subprocess exit code explicitly rather than relying on thrown errors, since `execa`/`child_process.exec` may not throw on non-zero exit.
```

- [ ] **Step 3: Update task 6 to handle file move errors**

In `tasks.md`, append a new sub-task after task 6.5:

```markdown
- [ ] 6.7 In `skill-dir.ts`, wrap each `fs.rename` call in a try/catch. On failure: print to stderr which file failed and the error message, then `process.exit(1)`. Do not attempt to roll back already-moved files.
```

- [ ] **Step 4: Verify**

Re-read spec.md new requirement. Confirm two scenarios (npm install failure, file move failure) are present. Confirm tasks 5.6 and 6.7 exist and describe the error output format and exit code.

---

## Task 9: Add missing test tasks — sandbox helper, scaffold.ts, packages/ui, wizard e2e

**Finding:** Three testing gaps:
1. No sandbox helper task for packages/create integration tests (scaffold runs npm commands and file moves requiring temp-dir isolation)
2. No test task for scaffold.ts (the most stateful module with 5 spec scenarios)
3. No test tasks for packages/ui despite shared-ui/spec.md defining 7 testable scenarios
4. No automated e2e test task for wizard (task 10.4 is a manual step)

**Files:**
- Modify: `openspec/changes/create-skillet/tasks.md` (add test subtasks throughout)

- [ ] **Step 1: Add sandbox helper task as task 3.4**

In `tasks.md` after task 3.3, add:

```markdown
- [ ] 3.4 Create `packages/create/test/helpers/sandbox.ts` — a test helper that:
  1. Creates a fresh temp directory via `fs.mkdtemp`
  2. Optionally pre-populates it with a given file set (e.g., a `SKILL.md` file, a `skill/` subfolder)
  3. Returns `{ dir, cleanup }` where `cleanup()` removes the temp directory
  Mirror the shape of `packages/core/test/integration/helpers/sandbox.ts`. This is used by scaffold and skill-dir integration tests.
```

- [ ] **Step 2: Add test task for scaffold.ts as task 5.7**

In `tasks.md` after task 5.6, add:

```markdown
- [ ] 5.7 Write unit and integration tests for `scaffold.ts`:
  - **Unit — npm init conditional**: mock `fs.existsSync` to return false → assert `npm init -y` is called; return true → assert it is skipped
  - **Unit — npm pkg set fields**: call `executeScaffold` with a full config object → assert `npm pkg set` is called for each required field (name, version, description, author, license, type, engines.node, skillet.skillDir, bin)
  - **Unit — repository URL guard**: config with empty `repositoryUrl` → assert `npm pkg set repository.url` is NOT called
  - **Integration — bin/cli.js written**: using sandbox from task 3.4, run `executeScaffold` with `skillDir: 'skill/'` → read `bin/cli.js` → assert it contains `new URL('../skill/', import.meta.url)` (the interpolated value, not `<skillPath>`)
  - **Integration — bin/cli.js chmod**: assert `bin/cli.js` stat mode includes execute bits (`(stat.mode & 0o111) !== 0`)
```

- [ ] **Step 3: Add test tasks for packages/ui as tasks 1.10–1.13**

In `tasks.md` after task 1.9, add:

```markdown
- [ ] 1.10 Write unit tests for `packages/ui/src/colors.ts`: import `{ ember500, irisBright, basil, dim }` from the compiled package → assert each is a function (chalk color instance) and does not throw when called with a string
- [ ] 1.11 Write unit tests for `packages/ui/src/spinner.ts`:
  - TTY spinner (`createSpinner(true)`): call `start('label')` then `succeed('done')` — assert `process.stdout.write` was called and the final write does NOT contain ANSI escape sequences on the success line (or assert the exact ANSI clear sequence was emitted)
  - Non-TTY spinner (`createSpinner(false)`): call `succeed('done')` — assert stdout received `'done\n'` with no ANSI escape codes
- [ ] 1.12 Write unit tests for `packages/ui/src/wordmark.ts`:
  - `deriveDisplayName('@skillet-cli/core')` → `'CORE'`
  - `deriveDisplayName('create-skillet')` → `'CREATE-SKILLET'`
  - `generateWordmark('CORE')` with `process.stdout.columns` set to 10 (too narrow for figlet) → returns a plain ember-bold string, not figlet art
  - `generateWordmark('CORE')` with `process.stdout.columns` set to 200 → returns a string containing ANSI color codes (figlet rendered)
- [ ] 1.13 Write unit tests for `packages/ui/src/header.ts`:
  - `renderFullHeader({ wordmark: 'W', tagline: 'T', attributionLine: 'A' })` in TTY (mock `process.stdout.isTTY = true`, `process.env.CI` unset) → returned string contains `'A'`
  - Same call with `process.env.CI = 'true'` → returns `''`
  - `renderLightHeader({ ... , attributionLine: 'X' })` in TTY → returned string contains `'X'`
```

- [ ] **Step 4: Add automated e2e test task**

In `tasks.md`, replace task 10.4:

Old:
```
- [ ] 10.4 Run `npx . install` from a temporary skill directory to confirm the wizard executes end-to-end in a real terminal
```

New:
```
- [ ] 10.4 Create `packages/create/test/e2e/wizard.test.ts` — an automated e2e test that:
  1. Creates a temp directory with a `SKILL.md` file using the sandbox helper
  2. Spawns `create-skillet` as a subprocess (from the built dist) using `@inquirer/prompts`-compatible stdin piping or by pre-seeding all prompts via CLI args if supported
  3. Asserts: process exits 0, `package.json` exists with required fields, `bin/cli.js` exists and is executable, `skill/SKILL.md` exists (moved from root)
  Mirror the pattern in `packages/core/test/e2e/install.test.ts` and `packages/core/test/e2e/globalSetup.ts`. Run as part of `pnpm --filter create-skillet test:e2e` (separate vitest config).
  **Note:** If fully automated e2e is not feasible for the interactive wizard (stdin piping to @inquirer/prompts is non-trivial), document the limitation and keep this as a documented manual step — but create the test file scaffold so future automation can be added.
```

- [ ] **Step 5: Verify**

Confirm tasks.md now has: task 3.4 (sandbox helper), tasks 5.7 (scaffold tests), tasks 1.10–1.13 (packages/ui tests), updated task 10.4 (e2e test). Re-read each to confirm test assertions are specific, not vague.

---

## Self-Review Checklist

After all 9 tasks are complete, verify spec coverage:

- [ ] **Finding 1 (bin/cli.js `<skillPath>`)** — tasks.md 5.2 shows interpolation; spec scenario shows concrete `skill/` path. ✓
- [ ] **Finding 2 (packages/ui exports/main)** — tasks.md 1.1 has `exports` and `main`; monorepo spec has scenario. ✓
- [ ] **Finding 3 (empty repository.url)** — tasks.md 5.1 has conditional guard; spec has blank-URL scenario. ✓
- [ ] **Finding 4 (skill/ boolean vs path)** — `DetectionResult` interface has `skillDir: string | null`; task 3.2 explains precedence. ✓
- [ ] **Finding 5 (no scaffold.ts tests)** — task 5.7 has 5 specific test assertions. ✓
- [ ] **Finding 6 (no packages/ui tests)** — tasks 1.10–1.13 have tests for all 4 modules, covering all spec scenarios. ✓
- [ ] **Finding 7 (no error handling)** — spec has requirement + 2 scenarios; tasks 5.6 and 6.7 specify exit code 1 and error format. ✓
- [ ] **Finding 8 (tsup config underspecified)** — task 1.6 shows full 5-field tsup.config.ts; design.md explains why each field is required. ✓
- [ ] **Finding 9 (tagline unreachable)** — task 7.1 wires `detected.name` to tagline; task 7.2 establishes detection-before-header order; spec scenario verifies name interpolation. ✓
- [ ] **Finding 10 (npm create <name> unhandled)** — design.md has decision; task 2.5 shows Commander `.argument('[name]')`; spec has CLI-arg-override scenario. ✓
- [ ] **No placeholder scan violations** — search each edited section for "TBD", "TODO", "implement later", "add appropriate error handling". Fix any found.
- [ ] **Type consistency** — `DetectionResult.skillDir: string | null` (task 3.1) → used in task 3.2 ("takes precedence"), task 4.1 (`collectConfig(detected)`), task 7.1 (`detected.name`). All references consistent.
