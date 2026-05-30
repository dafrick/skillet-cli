## 1. Project Setup

- [ ] 1.1 Initialise `packages/core/` directory with `package.json` (`@skillet/core`, `"type": "module"`, Node 18 engine, exports map)
- [ ] 1.2 Add runtime dependencies: `commander`, `gray-matter`, `update-notifier`, `@inquirer/prompts`
- [ ] 1.3 Add dev dependencies: `typescript`, `vitest`, `@types/node`
- [ ] 1.4 Configure `tsconfig.json` for ESM output targeting Node 18
- [ ] 1.5 Add `vitest.config.ts` and a passing smoke test to confirm the test harness works

## 2. Skill Normalization

- [ ] 2.1 Implement `normalizeSkill(skillDir: string): NormalizedSkill` — resolve path, read `SKILL.md`, parse with `gray-matter` to extract `{ data, content }`, call `hashSkill` and attach result as `contentHash`
- [ ] 2.2 Validate required fields (`name`, `description`); throw descriptive errors on missing fields or missing `SKILL.md`
- [ ] 2.3 Export `NormalizedSkill` TypeScript interface
- [ ] 2.4 Unit-test: valid file, missing name, missing description, missing file, optional `version` field, custom frontmatter passthrough, relative path resolution

## 3. Content Hashing

- [ ] 3.1 Implement `hashSkill(skillDir: string, opts?: { ignore?: string[] }): Promise<string>` using Node `crypto` SHA-256
- [ ] 3.2 Implement recursive file listing with default ignore set (`.git`, `node_modules`, `.DS_Store`, `.skill-meta.json`)
- [ ] 3.3 Sort files by relative POSIX path; normalise Windows backslashes to forward slashes
- [ ] 3.4 For each file: feed `relPath\0content\0`; detect text files (no NUL bytes) and normalise `\r\n`→`\n`
- [ ] 3.5 Return hex digest prefixed with `sha256:`
- [ ] 3.6 Unit-test: same content = same hash across path-separator styles; rename changes hash; edit changes hash; Windows line endings match Unix; custom ignore; `.skill-meta.json` excluded

## 4. Adapter Registry

- [ ] 4.1 Define `Adapter` TypeScript interface (`id`, `label`, `detect`, `supportsScope`, `resolveInstallPath`, `render`)
- [ ] 4.2 Implement `registry` object with `registry.register(adapter)`, `registry.get(id)`, `registry.list()`; throw on duplicate `id`; export top-level `registerAdapter` as alias for `registry.register`
- [ ] 4.3 Implement `claude` adapter: detect `~/.claude/` (user scope) and `.claude/` in cwd (project scope); `resolveInstallPath` returns correct path per scope; `render` is passthrough
- [ ] 4.4 Implement `copilot` adapter: detect `.github/` in cwd for project scope only; `supportsScope('user')` returns false; `render` is passthrough
- [ ] 4.5 Implement `agents` adapter: always returns both scopes as available; `resolveInstallPath` returns `~/.agents/skills/<name>/` (user) or `.agents/skills/<name>/` (project); `render` is passthrough
- [ ] 4.6 Register all three built-in adapters in the package entry point
- [ ] 4.7 Unit-test each adapter's `detect`, `supportsScope`, `resolveInstallPath`, and `render`; test registry duplicate rejection and `listAdapters`

## 5. Install Orchestration

- [ ] 5.1 Implement `performInstall(skill, adapter, scope, opts)`: call `adapter.render()`, copy tree to resolved path (creating parents), write `.skill-meta.json`
- [ ] 5.2 Implement manifest writer: populate all required `.skill-meta.json` fields including `renderHash`, `postInstallHash`, `installedAt`
- [ ] 5.3 Implement `computeRenderHash(contentHash, adapterId, libVersion): string`
- [ ] 5.4 Implement tree copy utility that mirrors full directory structure (including nested subdirs) to destination
- [ ] 5.5 Call `beforeInstall` hook before copy and `afterInstall` hook after manifest write (when hooks provided)
- [ ] 5.6 Integration-test: fresh install creates correct files + manifest; manifest fields are correctly populated; `postInstallHash` matches re-hash of installed folder

## 6. Drift Detection

- [ ] 6.1 Implement `detectDrift(installPath: string): Promise<'pristine' | 'modified' | 'unknown'>` — read manifest, hash current folder, compare to `postInstallHash`
- [ ] 6.2 Handle missing `.skill-meta.json` → return `'unknown'`
- [ ] 6.3 Implement `isStale(installPath, currentContentHash): boolean` — compare manifest `contentHash` to current source hash
- [ ] 6.4 Unit-test: unmodified install is pristine; editing a file is modified; `.skill-meta.json`-only change is pristine; no manifest is unknown; stale detection

## 7. Update Flow

- [ ] 7.1 Implement `findExistingInstalls(skill): InstallRecord[]` — scan all registered adapter × scope combinations for `.skill-meta.json` presence
- [ ] 7.2 Implement update decision logic: skip if render hash unchanged and pristine; overwrite silently if pristine but stale; prompt if drifted; honor `--force`
- [ ] 7.3 Implement three-way drift prompt (backup and overwrite / overwrite / skip) using `@inquirer/prompts`; create timestamped backup directory on "backup" choice
- [ ] 7.4 Implement `--add-new` logic: after reconciling existing installs, detect newly available targets and offer them via the same install flow
- [ ] 7.5 Integrate `update-notifier` in the `run()` entry point, passing the author's `pkg` object
- [ ] 7.6 Integration-test: no-op on up-to-date install; silent overwrite on pristine+stale; backup created on drift; `--force` overwrites; non-TTY skips drifted installs

## 8. CLI Surface

- [ ] 8.1 Implement `run({ skillDir, pkg, hooks?, argv? })` function: validate `pkg` is present (throw if not), construct `commander` program, register four subcommands, call `extendProgram` hook if provided, parse `argv` (default `process.argv`); print help + error on unknown command
- [ ] 8.2 Implement `install` command handler: detect targets → multi-select prompt (interactive) or auto-select all (non-TTY / `--yes`) → call `performInstall` per target
- [ ] 8.3 Implement `--target` flag (multi-value) to bypass detection; `--scope` flag with scope validation against adapter `supportsScope`
- [ ] 8.4 Implement `update` command handler: `findExistingInstalls` → apply update decision logic per install → report results
- [ ] 8.5 Implement `uninstall` command handler: `findExistingInstalls` → multi-select prompt (all selected by default) → remove chosen directories
- [ ] 8.6 Implement `list` command handler: `findExistingInstalls` → `detectDrift` + `isStale` for each → print formatted table
- [ ] 8.7 Implement `transform` hook call between `normalizeSkill` and adapter dispatch
- [ ] 8.8 End-to-end test: `install --target agents --scope user --yes` installs correct files; `list` shows pristine; edit a file; `list` shows modified; `update --force` restores pristine

## 9. Exports and Package Polish

- [ ] 9.1 Define `package.json` `exports` map exposing `run`, `normalizeSkill`, `hashSkill`, `registry` (object with `.register`/`.get`/`.list`), `registerAdapter` (alias), `install`, `update` as named exports
- [ ] 9.2 Ensure all public APIs have TypeScript types exported
- [ ] 9.3 Add `files` field to `package.json` to exclude `src`, tests, and dev config from published artifact
- [ ] 9.4 Add `prepublishOnly` script that runs build and tests
- [ ] 9.5 Write example `bin/cli.js` (3-line author template) in `examples/` for documentation reference
