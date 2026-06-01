# Developer Tooling & Test Infrastructure Design

**Date:** 2026-05-31
**Scope:** `@skillet-cli/core` monorepo — linting, formatting, pre-commit hooks, unit/integration/E2E test infrastructure, CI/CD, contributor documentation

---

## Context

`@skillet-cli/core` is a brand-new TypeScript ESM package with no prior codebase. This document specifies the developer tooling and test infrastructure to be set up before implementation begins, enabling TDD from the first task.

The library installs skill directories into agent-specific paths (`~/.claude/`, `.github/`, `.agents/`) and manipulates the filesystem directly. Test infrastructure must isolate tests from real home directories. The CLI has an interactive TTY mode (colors, spinners, prompts) and a non-TTY/CI mode; both must be testable.

---

## Repository Structure

```
skillet/
├── package.json                        ← pnpm workspace root (private: true)
├── pnpm-workspace.yaml                 ← packages: ["packages/*"]
├── biome.json                          ← single Biome config for entire monorepo
├── lefthook.yml                        ← pre-commit and commit-msg hooks
├── CONTRIBUTING.md                     ← developer onboarding and release process
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
└── packages/
    └── core/                           ← @skillet-cli/core
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── src/
        ├── fixtures/
        │   └── hello-skill/            ← minimal valid SKILL.md tree for tests
        └── test/
            ├── unit/                   ← pure functions, no filesystem
            ├── integration/            ← direct function calls, HOME-overridden sandbox
            │   └── helpers/            ← createSandbox(), fixture loader
            └── e2e/                    ← cli-testing-library, real pty
                └── helpers/            ← run-cli.ts spawn wrapper
```

---

## Code Quality Toolchain

### Biome

Single `biome.json` at the repo root covers all packages.

Key settings:
- **Formatter:** 2-space indent, single quotes, 100-char line width
- **Linter:** `recommended` ruleset plus:
  - `noConsole` — all CLI output must go through the design system (`ui/`), not raw `console.log`
  - `useImportType` — explicit `import type` for ESM tree-shaking correctness
  - `useNodejsImportProtocol` — all Node built-in imports use the `node:` prefix (`node:fs`, `node:path`, `node:crypto`)
- **`organizeImports`:** enabled — imports auto-sorted on format

### Lefthook

`lefthook.yml` defines two hooks:

**`pre-commit`**
1. `biome check --write` on staged files only (fast — scoped to changed files)
2. `tsc --noEmit` — catches type errors that Biome does not

**`commit-msg`**
- Validates conventional commits pattern: `feat|fix|chore|test|docs|refactor|perf|ci|build|spec`

The `tsc --noEmit` runs at commit time rather than on every save to keep the hook fast enough that contributors don't bypass it.

---

## Test Infrastructure

### Vitest Configuration

- **`pool: 'forks'`** — process-per-file isolation; required because tests manipulate `process.env.HOME` and `process.cwd()`
- **Workers:** capped at 4 to prevent resource exhaustion in CI
- **Global setup:** pre-builds `packages/core/` before the E2E suite runs
- **Coverage:** text + JSON + HTML; excludes `test/`, `fixtures/`, `dist/`, config files

### Test Isolation Strategy

Adapters resolve install paths via `os.homedir()` (which reads `HOME`/`USERPROFILE`) and `process.cwd()` for project scope. Tests override these with `mkdtemp()`-created temp directories, ensuring no test ever touches a real `~/.claude/`, `.github/`, or `.agents/` directory.

**`createSandbox()` helper** (shared across integration and E2E layers):

```ts
async function createSandbox() {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'skillet-'))
  const home = path.join(root, 'home')
  const cwd  = path.join(root, 'project')
  await fs.mkdir(home, { recursive: true })
  await fs.mkdir(cwd,  { recursive: true })
  process.env.HOME = home     // os.homedir() → HOME on Linux/macOS
  process.env.USERPROFILE = home  // os.homedir() → USERPROFILE on Windows
  process.chdir(cwd)
  return {
    root, home, cwd,
    [Symbol.asyncDispose]: () => fs.rm(root, { recursive: true, force: true })
  }
}
```

Cleanup runs in `afterEach` via `Symbol.asyncDispose` or explicit `afterEach(() => fs.rm(...))`.

---

### Layer 1 — Unit Tests (`test/unit/`)

Pure functions only. No filesystem access, no `HOME` manipulation.

| File | What it covers |
|---|---|
| `hash.test.ts` | Same content → same hash; rename changes hash; `\r\n` normalised to `\n`; backslash paths normalised; `.skill-manifest.json` excluded; custom ignore list |
| `normalize.test.ts` | Valid SKILL.md; missing `name`; missing `description`; missing file; optional `version`; frontmatter passthrough |
| `registry.test.ts` | `register`/`get`/`list`; duplicate ID throws; `registerAdapter` alias works |
| `adapter-claude.test.ts` | `detect()`, `supportsScope()`, `resolveInstallPath()`, `render()` — HOME set inline |
| `adapter-copilot.test.ts` | As above; `supportsScope('user')` returns false |
| `adapter-agents.test.ts` | As above; always returns both scopes |
| `ui-colors.test.ts` | Token wrappers produce ANSI output when `isTTY` mocked true; no output when false |
| `ui-wordmark.test.ts` | Returns non-empty string when TTY; returns empty string when no TTY |
| `ui-verbs.test.ts` | `pickVerb()` returns values from correct pool; sentence-case in TTY, lowercase in non-TTY |

---

### Layer 2 — Integration Tests (`test/integration/`)

Direct library function calls inside a per-test `createSandbox()`. Tests are parameterized across adapter × scope combinations using `test.each`:

```ts
test.each([
  ['claude',  'user',    '.claude/skills'],
  ['claude',  'project', '.claude/skills'],
  ['copilot', 'project', '.github/copilot/skills'],
  ['agents',  'user',    '.agents/skills'],
  ['agents',  'project', '.agents/skills'],
])('installs correctly: %s / %s', async (adapterId, scope, expectedSubdir) => {
  await using sandbox = await createSandbox()
  // seed detection markers (e.g. mkdir .claude for claude adapter)
  // call performInstall(...)
  // assert files exist at correct path
  // assert .skill-manifest.json fields
  // assert postInstallHash matches re-hash of installed folder
})
```

Key scenarios covered:

- **Fresh install** — correct files written; `.skill-manifest.json` populated with all required fields; `postInstallHash` matches re-hash of installed folder
- **Idempotent install** — running install twice on a pristine install is a no-op
- **Drift detection** — edit a file post-install → `detectDrift()` returns `'modified'`; unmodified → `'pristine'`; no manifest → `'unknown'`
- **Stale detection** — `isStale()` returns true when source has changed, false when current
- **Update: pristine + stale** — overwrites silently, no prompt
- **Update: drifted + `--force`** — overwrites without backup
- **Update: drifted without `--force`** — skips in non-TTY (prompt bypassed)
- **Uninstall** — directory removed; `findExistingInstalls()` returns empty
- **Copilot user-scope rejection** — attempting user-scope install throws
- **Hooks** — `beforeInstall` and `afterInstall` called in correct order with correct arguments

---

### Layer 3 — E2E Tests (`test/e2e/`)

Uses **`cli-testing-library`** which spawns the CLI inside a real pseudo-terminal (pty) so `process.stdout.isTTY` is `true`. This exercises the full visual output — wordmark, colors, spinners, and interactive `@inquirer/prompts` flows.

A `renderCli(args, sandboxOpts)` helper wraps `cli-testing-library`'s `render()` with sandbox creation and `HOME` injection.

Key scenarios:

- **Golden path TTY install** — `install` → scope prompt appears → target multi-select appears → keystrokes select → spinner runs → done line shows cooking verb
- **Golden path non-TTY install** — `install --target agents --scope user --yes` → prefixed log lines, no color, exit 0, files exist
- **`list` output** — shows correct status (pristine/modified/stale) per install
- **Edit file → `list` shows modified** — filesystem state reflected in output
- **`update --force`** — restores file, `list` shows pristine
- **`NO_COLOR` env var** — output contains no ANSI codes
- **Invalid `--target`** — exit 1 with descriptive error
- **Non-TTY default to `--yes`** — `stdin` not a TTY → behaves as if `--yes` passed

---

## CI/CD

### `ci.yml`

Runs on every PR and push to `main`.

| Job | Platforms | Purpose |
|---|---|---|
| `quality` | ubuntu-latest | `biome check` + `tsc --noEmit` |
| `unit` | ubuntu-latest | Vitest unit suite |
| `integration` | ubuntu, macos, windows | Vitest integration suite — verifies cross-platform path handling |
| `e2e` | ubuntu, macos, windows | Vitest E2E suite via cli-testing-library |

- `quality` and `unit` run on Linux only — fast and platform-independent
- `integration` and `e2e` use `fail-fast: false` so a Windows failure does not mask a macOS failure
- Node pinned to 20 (LTS), pnpm pinned to 9
- Windows integration tests use a helper that normalises `HOME` vs `USERPROFILE` and `path.delimiter` for PATH manipulation

### `release.yml`

Runs on version tags (`v*`), gated on `ci.yml` passing:
1. `pnpm install`
2. `pnpm -F @skillet-cli/core build`
3. `pnpm -F @skillet-cli/core prepublishOnly` (runs build + tests)
4. `npm publish --access public` to the `@skillet-cli` scope

---

## CONTRIBUTING.md

Written as part of this deliverable. Covers:

- **Prerequisites:** Node 20+, pnpm 9+
- **Setup:** `pnpm install && lefthook install`
- **Available scripts:**
  - `pnpm test` — all layers
  - `pnpm test:unit` — unit only (fast, use during TDD)
  - `pnpm test:integration` — integration only
  - `pnpm test:e2e` — E2E only (requires build)
  - `pnpm lint` — `biome check`
  - `pnpm format` — `biome check --write`
  - `pnpm build` — TypeScript compile
  - `pnpm typecheck` — `tsc --noEmit`
- **Running a single test file:** `pnpm vitest run test/unit/hash.test.ts`
- **Conventional commits reference:** `feat|fix|chore|test|docs|refactor|perf|ci|build|spec`
- **Release process:** create a version tag `vX.Y.Z` on `main` → `release.yml` publishes to npm

---

## Decisions

**D1: HOME env var override for test isolation, not dependency injection.**
Keeps the adapter API clean (no `baseDir` parameter), tests real `os.homedir()` call paths, and is the standard pattern for CLI tools (npm, fnm, volta all use this).

**D2: `pool: 'forks'` in Vitest.**
`process.env.HOME` and `process.chdir()` are global state. Forks ensure no bleed between test files.

**D3: `cli-testing-library` over raw `node-pty`.**
Same relationship as Playwright to Chromium — abstracts pty complexity, provides Testing Library-style query API, handles stream cleanup.

**D4: Biome over ESLint + Prettier.**
Single tool, near-zero config, fast. The `noConsole` rule covers the most important project-specific concern (force all output through the design system).

**D5: Lefthook over Husky.**
No `postinstall` script required. Husky's `prepare` script fails silently in CI and with `--ignore-scripts`, which is a common contributor footgun.

**D6: Matrix on integration + E2E only, not unit.**
Unit tests are pure functions with no platform-specific behaviour. Running them on 3 platforms wastes CI minutes. Integration and E2E exercise real path handling and filesystem semantics where platform differences matter.
