## MODIFIED Requirements

### Requirement: Integration tests cover library functions across adapter × scope combinations
`test/integration/` SHALL use `createSandbox()` for every test. Tests SHALL be parameterized with `test.each` across all valid adapter × scope combinations:

| adapterId | scope     | expectedSubdir              |
|-----------|-----------|---------------------------|
| `claude`  | `user`    | `.claude/skills`          |
| `claude`  | `project` | `.claude/skills`          |
| `copilot` | `user`    | `.copilot/skills`         |
| `copilot` | `project` | `.github/skills`          |
| `agents`  | `user`    | `.agents/skills`          |
| `agents`  | `project` | `.agents/skills`          |

The following scenarios SHALL be covered for each valid combination:

- **Fresh install**: correct files written to `<expectedSubdir>/<skill-name>/`; `.skill-manifest.json` contains all required fields with the formats defined below; `postInstallHash` matches a fresh re-hash of the installed folder (excluding `.skill-manifest.json`)

**`.skill-manifest.json` field formats for assertion:**

| Field | Type | Format | Source |
|---|---|---|---|
| `name` | string | matches SKILL.md `name` frontmatter | `NormalizedSkill.name` |
| `description` | string | matches SKILL.md `description` frontmatter | `NormalizedSkill.description` |
| `source` | string | `"npm:<pkg.name>@<pkg.version>"` (e.g. `"npm:@skillet-cli/hello@1.0.0"`) | `RunOptions.pkg` |
| `declaredVersion` | string \| undefined | semver string from SKILL.md frontmatter, or absent if not declared | `NormalizedSkill.declaredVersion` |
| `contentHash` | string | `sha256:` prefix + 64-char lowercase hex digest | `hashSkill()` output |
| `renderHash` | string | `sha256:` prefix + 64-char lowercase hex digest | `computeRenderHash()` output |
| `adapterId` | string | one of `'claude'`, `'copilot'`, `'agents'` | adapter `id` field |
| `scope` | string | one of `'user'`, `'project'` | install call argument |
| `libVersion` | string | semver string of `@skillet-cli/core` used for the install | package version at install time |
| `installedAt` | string | ISO 8601 UTC (`new Date().toISOString()` format, e.g. `"2026-05-31T12:00:00.000Z"`) | set at install time |
| `postInstallHash` | string | `sha256:` prefix + 64-char lowercase hex digest | re-hash of installed folder |

Tests asserting `installedAt` SHALL check that it is a valid ISO 8601 string (e.g. `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/`) rather than an exact value.
- **Idempotent install**: running install twice on an unmodified install produces no changes and exits successfully
- **Drift detection**: editing a file post-install causes `detectDrift()` to return `'modified'`; an unmodified install returns `'pristine'`; an install with no `.skill-manifest.json` returns `'unknown'`
- **Stale detection**: `isStale()` returns `true` when the source skill has changed; returns `false` when source matches the stored `contentHash`
- **Update pristine+stale**: overwrites silently without prompting
- **Update drifted + `--force`**: overwrites without backup
- **Update drifted without `--force`** (non-TTY): skips the install and reports the skip
- **Uninstall**: removes the installed directory; subsequent `findExistingInstalls()` returns empty for that adapter/scope
- **Hooks**: `beforeInstall` is called before files are copied; `afterInstall` is called after `.skill-manifest.json` is written; both receive correct arguments

#### Scenario: Fresh install writes correct files
- **WHEN** `performInstall(skill, adapter, 'user', {})` is called inside a sandbox with `~/.claude/` present
- **THEN** all files from the fixture skill are present at `~/.claude/skills/skilletize/` and `.skill-manifest.json` exists with a valid `postInstallHash`

#### Scenario: postInstallHash matches re-hash
- **WHEN** a fresh install completes
- **THEN** calling `hashSkill(installPath, { ignore: ['.skill-manifest.json'] })` returns a value equal to the `postInstallHash` in the written manifest

#### Scenario: Drift is detected after file edit
- **WHEN** a file inside the installed skill directory is modified after install
- **THEN** `detectDrift(installPath)` returns `'modified'`

#### Scenario: hooks fire in correct order
- **WHEN** `performInstall` is called with `beforeInstall` and `afterInstall` hooks
- **THEN** `beforeInstall` is called before any files are written and `afterInstall` is called after `.skill-manifest.json` exists on disk

---

### Requirement: E2E tests cover the full CLI via real pty
`test/e2e/` SHALL use **`crutchcorn/cli-testing-library`** (npm: `cli-testing-library`) — the Testing Library-style wrapper around `node-pty` that provides `render()`, `findByText()`, and `userEvent.keyboard()`. (There are two packages with similar names; this is the `crutchcorn` variant at https://github.com/crutchcorn/cli-testing-library.)

A `renderCli(args, sandboxOpts)` helper SHALL wrap `cli-testing-library`'s `render()` and inject the sandbox home path via the **spawn environment**, not via `process.env` mutation. Because `render()` spawns a child process, only values passed in the `env` option of the spawn call are visible to the child — mutations to `process.env` in the test process are not inherited. The correct pattern is:

```ts
render('node', ['bin/cli.js', ...args], {
  env: { ...process.env, HOME: sandbox.home, USERPROFILE: sandbox.home }
})
```

The `renderCli` helper SHALL create the sandbox, pass `HOME`/`USERPROFILE` through spawn `env`, and register cleanup in `afterEach`.

E2E tests SHALL use a separate **`vitest.config.e2e.ts`** (not the main `vitest.config.ts`) so the pre-build global setup runs only when the E2E suite is explicitly invoked. The `test:e2e` script SHALL point to this config: `vitest run --config vitest.config.e2e.ts`. The main `vitest.config.ts` SHALL NOT include `test/e2e/**` in its include patterns, preventing accidental E2E execution during `pnpm test:unit` or `pnpm test:integration`.

The following scenarios SHALL be covered:

- **Golden path TTY install**: `install` command shows the scope prompt, then the target multi-select prompt, accepts keyboard input, runs a spinner with a cooking verb, and prints a done line; files exist at the correct install path after the command exits
- **Golden path non-TTY install**: `install --target agents --scope user --yes` prints prefixed log lines with no ANSI color codes, exits 0, and writes correct files
- **`list` output after install**: `list` command shows the install with `pristine` status
- **`list` output after file edit**: after editing a file in the install directory, `list` shows `modified` status
- **`update --force` restores pristine**: after editing a file, `update --force` overwrites it and `list` shows `pristine`
- **`NO_COLOR` env var suppresses color**: when `NO_COLOR=1` is set, stdout contains no ANSI escape sequences
- **Invalid `--target` exits 1**: passing an unknown target name causes the CLI to exit with code 1 and print a descriptive error
- **Non-TTY defaults to `--yes`**: when stdin is not a TTY, the install command behaves as if `--yes` was passed

#### Scenario: TTY install completes with cooking verb
- **WHEN** `renderCli(['install'])` is used with keyboard input to select a scope and target
- **THEN** `findByText` locates the done cooking verb (e.g. `Sautéed`) in stdout and the installed files exist on disk

#### Scenario: Non-TTY install produces prefixed log lines
- **WHEN** the CLI is spawned with stdin closed (not a TTY) and args `['install', '--target', 'agents', '--scope', 'user', '--yes']`
- **THEN** stdout lines match the pattern `[<pkg-name>] <verb> agents…` / `[<pkg-name>] ✔ <done> — <path>`, contain no ANSI codes, and `SKILL.md` exists at `~/.agents/skills/skilletize/SKILL.md`

#### Scenario: NO_COLOR suppresses ANSI output
- **WHEN** the CLI is spawned with `env.NO_COLOR = '1'`
- **THEN** stdout contains no ANSI escape code sequences (no `[` patterns)

#### Scenario: Invalid target exits 1
- **WHEN** the CLI is run with `--target nonexistent`
- **THEN** the process exits with code 1 and stderr contains a message identifying the unknown target
