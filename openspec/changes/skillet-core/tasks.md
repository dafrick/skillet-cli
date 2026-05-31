## 1. Project Setup

- [ ] 1.1 Initialise `packages/core/` directory with `package.json` (`@skillet/core`, `"type": "module"`, Node 24 engine, exports map)
- [ ] 1.2 Add runtime dependencies: `commander`, `gray-matter`, `update-notifier`, `@inquirer/prompts`, `@inquirer/core` (custom prompt primitives), `chalk` (v5, ESM-native; required for all Ember/Iris/Basil/Chili color output)
- [ ] 1.3 Add dev dependencies: `typescript`, `vitest`, `@types/node`
- [ ] 1.4 Configure `tsconfig.json` for ESM output targeting Node 24
- [ ] 1.5 Add `vitest.config.ts` and a passing smoke test to confirm the test harness works
- [ ] 1.6 Define shared TypeScript interfaces in `src/types.ts`: `Scope` (`'user' | 'project'`), `SkillManifest` (all `.skill-manifest.json` fields: `name`, `description`, `source`, `declaredVersion`, `contentHash`, `renderHash`, `adapterId`, `scope`, `libVersion`, `installedAt`, `postInstallHash`), `InstallRecord` (`adapter`, `scope`, `installPath`, `manifest`), `RunOptions` (`skillDir`, `pkg: { name, version }`, `argv?`, `hooks?: { transform?, beforeInstall?, afterInstall?, extendProgram? }`); export all from `src/index.ts`

## 2. Skill Normalization

- [ ] 2.1 Implement `normalizeSkill(skillDir: string): NormalizedSkill` — resolve path, read `SKILL.md`, parse with `gray-matter` to extract `{ data, content }`, call `hashSkill` and attach result as `contentHash`
- [ ] 2.2 Validate required fields (`name`, `description`); throw descriptive errors on missing fields or missing `SKILL.md`
- [ ] 2.3 Export `NormalizedSkill` TypeScript interface
- [ ] 2.4 Unit-test: valid file, missing name, missing description, missing file, optional `version` field, custom frontmatter passthrough, relative path resolution, `contentHash` present and starts with `sha256:`, `contentHash` changes when a file is edited

## 3. Content Hashing

- [ ] 3.1 Implement `hashSkill(skillDir: string, opts?: { ignore?: string[] }): Promise<string>` using Node `crypto` SHA-256
- [ ] 3.2 Implement recursive file listing with default ignore set (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`)
- [ ] 3.3 Sort files by relative POSIX path; normalise Windows backslashes to forward slashes
- [ ] 3.4 For each file: feed `relPath\0content\0`; detect text files (no NUL bytes) and normalise `\r\n`→`\n`
- [ ] 3.5 Return hex digest prefixed with `sha256:`
- [ ] 3.6 Unit-test: same content = same hash across path-separator styles; rename changes hash; edit changes hash; Windows line endings match Unix; custom ignore; `.skill-manifest.json` excluded; `.git` directory excluded; result starts with `sha256:` prefix; filesystem iteration order does not affect result; binary files (NUL bytes) hashed without line-ending normalisation

## 4. Adapter Registry

- [ ] 4.1 Define `Adapter` TypeScript interface (`id`, `label`, `detect`, `supportsScope`, `resolveInstallPath`, `render`)
- [ ] 4.2 Implement `registry` object with `registry.register(adapter)`, `registry.get(id)`, `registry.list()`; throw on duplicate `id`; export top-level `registerAdapter` as alias for `registry.register`
- [ ] 4.3 Implement `claude` adapter: detect `~/.claude/` (user scope) and `.claude/` in cwd (project scope); `resolveInstallPath` returns correct path per scope; `render` is passthrough
- [ ] 4.4 Implement `copilot` adapter: detect `.github/` in cwd (project scope) and `~/.copilot/` (user scope); `resolveInstallPath` returns `.github/skills/<name>/` (project) or `~/.copilot/skills/<name>/` (user); `supportsScope` returns true for both scopes; `render` is passthrough
- [ ] 4.5 Implement `agents` adapter: always returns both scopes as available; `resolveInstallPath` returns `~/.agents/skills/<name>/` (user) or `.agents/skills/<name>/` (project); `render` is passthrough
- [ ] 4.6 Register all three built-in adapters in the package entry point
- [ ] 4.7 Unit-test each adapter's `detect`, `supportsScope`, `resolveInstallPath`, and `render`; test registry duplicate rejection and `listAdapters`

## 5. Install Orchestration

- [ ] 5.1 Implement `performInstall(skill, adapter, scope, opts)`: call `adapter.render()`, copy tree to resolved path (creating parents), write `.skill-manifest.json`
- [ ] 5.2 Implement manifest writer: populate all required `.skill-manifest.json` fields including `renderHash`, `postInstallHash`, `installedAt`
- [ ] 5.3 Implement `computeRenderHash(contentHash, adapterId, libVersion): string`
- [ ] 5.4 Implement tree copy utility that mirrors full directory structure (including nested subdirs) to destination
- [ ] 5.5 Call `beforeInstall` hook before copy and `afterInstall` hook after manifest write (when hooks provided)
- [ ] 5.6 Integration-test: fresh install creates correct files + manifest; manifest fields are correctly populated; `postInstallHash` matches re-hash of installed folder

## 6. Drift Detection

- [ ] 6.1 Implement `detectDrift(installPath: string): Promise<'pristine' | 'modified' | 'unknown'>` — read manifest, hash current folder, compare to `postInstallHash`
- [ ] 6.2 Handle missing `.skill-manifest.json` → return `'unknown'`
- [ ] 6.3 Implement `isStale(installPath, currentContentHash): boolean` — compare manifest `contentHash` to current source hash
- [ ] 6.4 Create `test/unit/drift.test.ts`; unit-test: unmodified install is pristine; editing a file is modified; `.skill-manifest.json`-only change is pristine; no manifest is unknown; stale detection

## 7. Update Flow

- [ ] 7.1 Implement `findExistingInstalls(skill): InstallRecord[]` — scan all registered adapter × scope combinations for `.skill-manifest.json` presence
- [ ] 7.2 Implement update decision logic: skip if render hash unchanged and pristine; overwrite silently if pristine but stale; prompt if drifted; honor `--force`
- [ ] 7.3 Implement three-way drift prompt (backup and overwrite / overwrite / skip) using `@inquirer/prompts`; show `⚠` warning in Ember 400 before the prompt; create timestamped sibling backup directory on "backup" choice using ISO8601Z naming (`<skill-name>.bak.<ISO8601Z>/`); `--force` bypasses prompt and overwrites without backup
- [ ] 7.4 Implement `--add-new` logic: after reconciling existing installs, detect newly available targets and offer them via the same install flow
- [ ] 7.5 Integrate `update-notifier` in the `run()` entry point, passing the author's `pkg` object
- [ ] 7.6 Integration-test: no-op on up-to-date install; silent overwrite on pristine+stale; backup created on drift; `--force` overwrites; non-TTY skips drifted installs

## 8. CLI Surface

- [ ] 8.1 Implement `run({ skillDir, pkg, hooks?, argv? })` function: validate `pkg` is present (throw if not), construct `commander` program, register four subcommands, call `extendProgram` hook if provided, parse `argv` (default `process.argv`); print help + error on unknown command
- [ ] 8.2 Implement `install` command handler: detect targets → two-step interactive prompts (1: scope single-select, 2: searchable target multi-select pre-selecting detected targets) or auto-select all (non-TTY / `--yes`) → call `performInstall` per target with per-target spinner using cooking verb from install pool
- [ ] 8.3 Implement `--target` flag (multi-value) to bypass detection; `--scope` flag with scope validation against adapter `supportsScope`; `--add-new` flag on the `update` command to detect newly available targets after reconciling existing installs and offer them via the install flow (wires into 7.4)
- [ ] 8.4 Implement `update` command handler: `findExistingInstalls` → apply update decision logic per install → report results
- [ ] 8.5 Implement `uninstall` command handler: `findExistingInstalls` → multi-select prompt (all selected by default) → remove chosen directories
- [ ] 8.6 Implement `list` command handler: `findExistingInstalls` → `detectDrift` + `isStale` for each → print formatted table
- [ ] 8.7 Implement `transform` hook call between `normalizeSkill` and adapter dispatch
- [ ] 8.8 Create `packages/core/bin/cli.js` as the test fixture CLI entry point: a 3-line ESM script that calls `run({ skillDir: '../fixtures/hello-skill', pkg })` — this file is what the E2E helper spawns; also add a `"bin"` field to `package.json` pointing to `bin/cli.js` so it is published and symlinked
- [ ] 8.9 End-to-end test: `install --target agents --scope user --yes` installs correct files; `list` shows pristine; edit a file; `list` shows modified; `update --force` restores pristine

## 9. CLI Design System

- [ ] 9.1 Implement color token module (`ui/colors.ts`) exporting `chalk.rgb()` wrappers for all Ember/Iris/Basil/Chili/dim tokens as named constants; import from here throughout all CLI output code
- [ ] 9.2 Implement wordmark renderer: 6-line ANSI-shadow block art with five-stop heated-iron gradient (`#FBD2A0 → #F0925A → #E8743B → #C75A28 → #9C441C`) applied row-by-row; shadow characters at 40% brightness of row color; TTY-gated (returns empty string when no TTY)
- [ ] 9.3 Implement full header (wordmark + random tagline from 20-item pool); shown only on `install` and `update`; suppressed when `!process.stdout.isTTY` or `CI` env var is set
- [ ] 9.4 Implement light header (`SKILLET` in Ember 500 bold all-caps + `chalk.dim` version + blurb + random tagline); shown on `list` and `uninstall`; same TTY gate as full header
- [ ] 9.5 Implement tagline pool (20 entries) with `randomTagline()` helper that picks one entry at random per invocation
- [ ] 9.6 Implement cooking verb pools for `install`, `update`, `uninstall`, and `detect` (5 verbs each); `pickVerb(command)` returns a random matched pair `{ active, done }`; active/done are sentence-case in TTY, lowercase in non-TTY/CI
- [ ] 9.7 Implement Ora-style spinner wrapping the cooking verb from the active command's pool; Ember spinner character (`⠙…`); spinner is no-op (immediate done line) in non-TTY environments
- [ ] 9.8 Implement two-step install prompts using `@inquirer/prompts`: (1) scope single-select with Iris cursor (`›`), `●`/`○` radio indicators, auto-skipped when `--scope` is passed or target supports only one scope; (2) searchable target multi-select pre-selecting detected targets, auto-skipped when `--target` is passed
- [ ] 9.9 Implement CI / non-TTY output: prefixed log lines `[pkg.name] <verb> <target>…` / `[pkg.name] ✔ <done> — <path>`; no header, no spinner, no color (respect `NO_COLOR` env var); verb copy is lowercase
- [ ] 9.10 Implement update notifier output: render after all command output, TTY only, when a newer npm version is available; format: `Update available  X.Y.Z → A.B.C` / `Run npm update <name> then <name> update`

## 10. Exports and Package Polish

- [ ] 10.1 Define `package.json` `exports` map exposing `run`, `normalizeSkill`, `hashSkill`, `registry` (object with `.register`/`.get`/`.list`), `registerAdapter` (alias), `install`, `update` as named exports
- [ ] 10.2 Ensure all public APIs have TypeScript types exported
- [ ] 10.3 Add `files` field to `package.json` to exclude `src`, tests, and dev config from published artifact
- [ ] 10.4 Add `prepublishOnly` script that runs build and tests
- [ ] 10.5 Write example `bin/cli.js` (3-line author template) in `examples/` for documentation reference
