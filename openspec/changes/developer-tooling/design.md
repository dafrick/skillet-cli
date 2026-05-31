## Context

`@skillet/core` is a brand-new TypeScript ESM package with no prior codebase. The repo is structured as a monorepo (`packages/core/`) anticipating future packages (`@skillet/cli`, fixture packages, a docs site). Because this is a library that installs skill directories into agent-specific filesystem paths — `~/.claude/`, `.github/`, `.agents/` — the test infrastructure must never touch a developer's real home directory. The CLI also has two distinct output modes: an interactive TTY mode (colors, gradients, spinners, `@inquirer/prompts` multi-select) and a non-TTY/CI mode with plain prefixed log lines. Both modes must be exercised by tests. All tooling must be in place before implementation begins to enable TDD from the first task.

## Goals / Non-Goals

**Goals:**
- Establish a pnpm monorepo workspace structure ready for `packages/core/` and future packages
- Provide a single-tool code quality baseline (Biome) covering format, lint, and import hygiene
- Wire pre-commit hooks (Lefthook) that catch type errors and style issues before they reach CI
- Design a three-layer test architecture where each layer has a distinct, non-overlapping purpose
- Isolate all integration tests from real home directories using `HOME`/`USERPROFILE` env var override
- Enable TTY and interactive prompt testing through `cli-testing-library`'s real pty
- Validate cross-platform path handling on Linux, macOS, and Windows in CI
- Document the contributor workflow (setup, scripts, release) in `CONTRIBUTING.md`

**Non-Goals:**
- Application logic implementation (that is the `skillet-core` change)
- Skill authoring lint/validation tooling
- A top-level `skillet` CLI
- Telemetry or usage tracking
- Windows-specific shell scripts or PowerShell wrappers beyond env var normalisation

## Decisions

### D1: HOME env var override for test isolation, not dependency injection

**Decision**: Adapters read `os.homedir()` which resolves `HOME` (Linux/macOS) or `USERPROFILE` (Windows). Integration tests override these env vars to point to an isolated `mkdtemp()` directory created per test. No `baseDir` parameter is added to the adapter API.

**Rationale**: Testing the real `os.homedir()` call path means the integration tests exercise the same code path that runs in production. Dependency injection would require adding a test-only parameter to the public adapter API, leaking a test-accommodation concern to skill authors who depend on the library. The env var approach is the standard pattern for CLI tools (npm, fnm, volta all use it).

**Alternative considered**: Passing `baseDir` to each adapter. Rejected: unnecessary API surface with no real author use-case.

---

### D2: `pool: 'forks'` in Vitest

**Decision**: Vitest is configured with `pool: 'forks'` to give each test file its own process.

**Rationale**: `process.env.HOME` and `process.chdir()` are global state. Without process isolation, a test that changes `HOME` bleeds into other tests running in the same process, causing non-deterministic failures. Forks eliminate this class of bug entirely.

**Alternative considered**: `pool: 'threads'` (the Vitest default) with manual `beforeEach`/`afterEach` cleanup. Rejected: cleanup is error-prone when tests throw mid-execution; forks are the correct tool when global state is unavoidable.

---

### D3: Three test layers with distinct purposes

**Decision**: Unit tests cover pure functions with no filesystem access. Integration tests call library functions directly inside a HOME-overridden sandbox. E2E tests spawn the compiled CLI binary inside a real pty via `cli-testing-library`.

**Rationale**: Each layer has a different failure surface. A hash algorithm bug shows up in unit tests (fast, no setup). A manifest-write bug or cross-target regression shows up in integration tests (moderate speed, filesystem assertions). A CLI flag regression or interactive prompt bug shows up in E2E tests (slower, requires build). Collapsing layers means either losing coverage speed or losing coverage fidelity.

**Alternative considered**: Two layers (unit + subprocess-only E2E). Rejected: the integration layer is where TDD happens — it's fast enough to run on every save and can parameterize cheaply across all adapter × scope combinations. Losing it means either writing slow E2E tests for every edge case or leaving internal functions untested.

---

### D4: `cli-testing-library` over raw `node-pty`

**Decision**: E2E tests use **`crutchcorn/cli-testing-library`** (npm package: `cli-testing-library`), which wraps `node-pty` with a Testing Library-style API (`render()`, `findByText()`, `userEvent.keyboard()`). Note: two packages share this name; this decision refers specifically to the `crutchcorn` variant.

**Rationale**: `cli-testing-library` abstracts pty lifecycle, stream cleanup, and process teardown — exactly the same relationship as Playwright to Chromium. The query API makes assertions readable without parsing raw ANSI escape sequences. Using `node-pty` directly would require reimplementing all of that plumbing per test.

**Alternative considered**: Raw `node-pty`. Rejected: too much boilerplate per test; stream cleanup errors in test teardown are a common footgun.

---

### D5: Biome over ESLint + Prettier

**Decision**: A single `biome.json` at the repo root handles both formatting and linting across all packages.

**Rationale**: Biome is fast, near-zero config, and has excellent TypeScript + ESM support. The most important project-specific rule — `noConsole` (all output must go through the `ui/` design system) — is available in Biome's linter under `linter.rules.suspicious.noConsole`. Import organisation uses the Biome v2 `assist.actions.source.organizeImports` key (the v1 top-level `organizeImports` key is silently ignored in v2). ESLint + Prettier would require two config files, the `eslint-config-prettier` bridge, and slower lint runs.

**Alternative considered**: ESLint + Prettier. Rejected for this project: two tools, two configs, shared conflict surface, slower.

---

### D6: Lefthook over Husky

**Decision**: Pre-commit hooks are managed by Lefthook.

**Rationale**: Lefthook requires no `postinstall` script. Husky's `prepare` script (`husky install`) fails silently when contributors run `npm install --ignore-scripts` (common in CI and some corporate environments), leaving hooks absent with no warning. Lefthook is activated by `lefthook install` as an explicit setup step, documented in `CONTRIBUTING.md`.

**Alternative considered**: Husky + lint-staged. Rejected: the `prepare`-script footgun is a real contributor experience problem, and lint-staged adds a second tool for a problem (running checks on staged files only) that Lefthook handles natively via the `{staged_files}` substitution passed directly to `biome check --write`.

---

### D7: Matrix on integration + E2E only, not unit or quality

**Decision**: `quality` and `unit` CI jobs run on `ubuntu-latest` only. `integration` and `e2e` jobs run a 3-platform matrix (ubuntu, macos, windows) with `fail-fast: false`.

**Rationale**: Quality checks (Biome, tsc) and unit tests (pure functions) have no platform-specific behaviour. Running them on 3 platforms triples CI minutes for zero additional signal. Integration and E2E tests exercise real filesystem semantics, path separator handling, and `HOME` vs `USERPROFILE` resolution — all of which differ across platforms and are exactly what the matrix is for. `fail-fast: false` ensures a Windows failure doesn't suppress macOS results.

---

### D8: Separate `vitest.config.e2e.ts` with global setup for pre-build

**Decision**: E2E tests use a dedicated `vitest.config.e2e.ts` (not the main `vitest.config.ts`) that includes a `globalSetup` file which runs `pnpm build` before the suite executes. The `test:e2e` script points to this config explicitly. The main `vitest.config.ts` does not include `test/e2e/**` files.

**Rationale**: Vitest's `globalSetup` runs unconditionally before any worker — there is no mechanism to detect "which test files are being run" inside `globalSetup`. The only reliable way to gate the pre-build step to E2E runs is to put it in a config file that is only used when E2E is explicitly requested. A single monolithic config would cause the build to run on every `pnpm test:unit` invocation, which is slow and surprising. Separate configs give each script a clean, predictable purpose.

## Risks / Trade-offs

**[Risk] `process.chdir()` in tests** → Changing the working directory is global state even with `pool: 'forks'`, because forks share the OS process before Vitest forks workers. Tests that rely on `process.cwd()` must use `createSandbox()` which sets cwd consistently and restores it in cleanup. Mitigation: `createSandbox()` is the only place `chdir()` is called; tests must not call it directly.

**[Risk] `cli-testing-library` pty cleanup on Windows** → node-pty on Windows uses a ConPTY backend which can leave orphaned processes on test failure. Mitigation: wrap all E2E tests in try/finally and call `cli.kill()` in teardown; cap worker count at 2 on Windows CI.

**[Risk] Biome `noConsole` false positives in test files** → Test files legitimately use `console` for debugging. Mitigation: configure Biome to disable `noConsole` in the `test/**` glob via the `overrides` key.

**[Risk] `HOME` override on macOS affecting Keychain** → `os.homedir()` is used by Node's TLS and keychain APIs in addition to the adapters. Tests that override `HOME` could theoretically affect unrelated Node internals. Mitigation: the `createSandbox()` helper creates a real directory (not an empty stub), and no test exercises TLS or keychain paths.

**[Trade-off] Pre-build requirement for E2E** → Developers must run `pnpm build` before `pnpm test:e2e` after source changes. Mitigation: document this clearly in `CONTRIBUTING.md`; the global Vitest setup handles it automatically when running the full `pnpm test` suite.

## Open Questions

- **`node-pty` native module on Windows CI**: `node-pty` requires native compilation and may need `windows-build-tools`. Verify whether the GitHub Actions `windows-latest` runner has the required MSVC build tools pre-installed, or whether a setup step is needed.
- **Biome version pinning**: Biome's linter ruleset evolves between minor versions. Decide whether to pin an exact Biome version or use a caret range. Given this is a developer dependency (not published), caret is probably fine, but a Renovate/Dependabot policy should be set.
- **`cli-testing-library` maturity on Windows**: Verify `cli-testing-library` works correctly on `windows-latest` in CI before committing to it as the E2E layer. If it doesn't, the fallback is `node-pty` directly with a thin spawn helper.
