## ADDED Requirements

### Requirement: CI pipeline runs on every PR, push to main, and version tags
`.github/workflows/ci.yml` SHALL trigger on `pull_request`, `push` to `main`, **and `push` to tags matching `v*`**. The tag trigger is required so that `release.yml` can gate on CI passing for the same tag commit via `workflow_run`. It SHALL pin Node.js to version 20 and pnpm to version 9 for reproducibility.

#### Scenario: CI triggers on pull request
- **WHEN** a pull request is opened or updated against `main`
- **THEN** the `ci.yml` workflow starts and all jobs run

#### Scenario: CI triggers on push to main
- **WHEN** a commit is pushed directly to `main`
- **THEN** the `ci.yml` workflow starts and all jobs run

#### Scenario: CI triggers on version tag push
- **WHEN** a tag `v0.1.0` is pushed
- **THEN** the `ci.yml` workflow starts, enabling `release.yml` to gate on its result via `workflow_run`

---

### Requirement: Quality and unit jobs run on Linux only
The `quality` job SHALL run `biome check` and `tsc --noEmit` on `ubuntu-latest`. The `unit` job SHALL run the Vitest unit suite on `ubuntu-latest`. Neither job uses a platform matrix.

#### Scenario: Quality job catches lint violations
- **WHEN** a PR introduces a `noConsole` violation in `src/`
- **THEN** the `quality` job exits non-zero and the CI run is marked failed

#### Scenario: Quality job catches type errors
- **WHEN** a PR introduces a TypeScript type error
- **THEN** the `quality` job's `tsc --noEmit` step exits non-zero

#### Scenario: Unit job runs pure function tests
- **WHEN** the `unit` job runs
- **THEN** all files under `test/unit/` are executed and results are reported

---

### Requirement: Integration and E2E jobs run a 3-platform matrix
The `integration` and `e2e` jobs SHALL each use a `matrix` strategy with `os: [ubuntu-latest, macos-latest, windows-latest]` and `fail-fast: false`.

#### Scenario: Windows failure does not suppress macOS results
- **WHEN** the integration job fails on `windows-latest`
- **THEN** the `macos-latest` and `ubuntu-latest` matrix legs continue to completion and report their results

#### Scenario: Integration tests pass on all three platforms
- **WHEN** the integration job runs on all three platforms
- **THEN** all tests in `test/integration/` pass, confirming cross-platform path handling is correct

#### Scenario: E2E tests pass on all three platforms
- **WHEN** the e2e job runs on all three platforms
- **THEN** all tests in `test/e2e/` pass, including TTY and non-TTY scenarios

---

### Requirement: Windows integration tests normalise HOME vs USERPROFILE
The integration test sandbox helper SHALL set both `process.env.HOME` and `process.env.USERPROFILE` to the sandbox home path. A cross-platform path helper in `test/integration/helpers/` SHALL use `path.delimiter` for any PATH manipulation and normalise path separators using `path.sep`.

#### Scenario: HOME is set correctly on Windows
- **WHEN** `createSandbox()` is called in a Windows CI runner
- **THEN** both `process.env.HOME` and `process.env.USERPROFILE` point to the sandbox home directory

---

### Requirement: Release workflow publishes to npm on version tags
`.github/workflows/release.yml` SHALL trigger via `workflow_run` on the `CI` workflow completing with `conclusion: success` on branches/tags matching `v*`. This is the correct gating mechanism: because `ci.yml` is configured to also run on tag pushes, `workflow_run` will fire after CI passes for the tag commit. The release job SHALL include an explicit condition `if: github.event.workflow_run.conclusion == 'success'` to prevent publishing on CI failure. The job steps SHALL: run `pnpm install`, build `@skillet/core`, run `prepublishOnly` (which executes build + tests), and publish to npm with `--access public` under the `@skillet` scope. The npm auth token SHALL be read from the `NPM_TOKEN` repository secret.

**Do not use** a tag-triggered `on: push: tags` approach with a `needs` dependency on another job — that creates a separate workflow run that cannot transitively depend on `ci.yml`.

#### Scenario: Tag triggers release workflow
- **WHEN** a tag `v0.1.0` is pushed to the repository
- **THEN** `release.yml` starts and, upon successful completion, `@skillet/core@0.1.0` is visible on npm

#### Scenario: Release is gated on CI passing
- **WHEN** a version tag is pushed but the CI pipeline is failing
- **THEN** the release workflow does not publish to npm

#### Scenario: Release uses correct npm scope
- **WHEN** the release workflow publishes
- **THEN** the package appears on npm as `@skillet/core` (scoped, public)

---

### Requirement: CI does not install Lefthook hooks
The CI environment SHALL run with `LEFTHOOK=0` set (or equivalent) to prevent Lefthook from installing git hooks during `pnpm install` in CI runners.

#### Scenario: pnpm install in CI does not write git hooks
- **WHEN** `pnpm install` runs in a GitHub Actions runner with `LEFTHOOK=0`
- **THEN** no files are written to `.git/hooks/` as part of the install
