## 1. Monorepo Root Setup

- [x] 1.1 Create root `package.json` with `"private": true`, workspace-level scripts (`test`, `lint`, `format`, `build`, `typecheck`), and `packageManager` field pinned to pnpm 9
- [x] 1.2 Create `pnpm-workspace.yaml` declaring `packages: ["packages/*"]`
- [x] 1.3 Run `pnpm install` to verify workspace resolution and confirm single `pnpm-lock.yaml` is generated at root

## 2. Core Package Scaffold

- [x] 2.1 Create `packages/core/package.json` with `"name": "@skillet/core"`, `"type": "module"`, `"engines": { "node": ">=24" }`, `"private": false`, and placeholder `version`, `description`, `exports`, `files`, `scripts` fields
- [x] 2.2 Create `packages/core/tsconfig.json` targeting ESNext modules, `NodeNext` module resolution, `outDir: "dist"`, `declaration: true`, `strict: true`, `lib: ["ESNext"]` — the `ESNext` lib is required for `Symbol.asyncDispose` and the `await using` pattern used in `createSandbox()`
- [x] 2.3 Create `packages/core/src/` directory with a placeholder `index.ts` that exports nothing (allows build to succeed from the start)
- [x] 2.4 Run `pnpm -F @skillet/core build` and confirm `dist/` is produced with no errors

## 3. Test Fixture

- [x] 3.1 Create `packages/core/fixtures/hello-skill/SKILL.md` with valid frontmatter (`name: hello-skill`, `description: A minimal fixture skill for testing`) and a non-empty markdown body
- [x] 3.2 Verify `normalizeSkill('packages/core/fixtures/hello-skill')` would succeed once the module exists (can be validated when unit tests run in task 7)

## 4. Biome Configuration

- [x] 4.1 Add `@biomejs/biome` as a dev dependency at the workspace root (`pnpm add -Dw @biomejs/biome`)
- [x] 4.2 Create `biome.json` at the repo root with: formatter settings (2-space indent, single quotes, 100-char line width), linter `recommended` ruleset with `linter.rules.suspicious.noConsole: "error"`, `linter.rules.style.useImportType: "error"`, `linter.rules.style.useNodejsImportProtocol: "error"`; import organiser enabled via Biome v2 key `assist.actions.source.organizeImports: "on"` (not the v1 top-level `organizeImports` key)
- [x] 4.3 Add `overrides` in `biome.json` to disable `noConsole` for the `test/**` glob
- [x] 4.4 Add `pnpm lint` script at root (`biome check .`) and `pnpm format` script (`biome check --write .`)
- [x] 4.5 Run `pnpm lint` and confirm it exits 0 on the current (near-empty) codebase

## 5. Lefthook Configuration

- [x] 5.1 Add `lefthook` as a dev dependency at the workspace root (`pnpm add -Dw lefthook`)
- [x] 5.2 Create `lefthook.yml` at the repo root with:
  - `pre-commit` hook: `biome check --write {staged_files}` (Lefthook substitutes staged file paths; do NOT use `--changed` which requires Biome VCS config) then `tsc --noEmit -p packages/core/tsconfig.json` (explicit `-p` required — no root-level `tsconfig.json` exists)
  - `commit-msg` hook: regex validation against `^(feat|fix|chore|test|docs|refactor|perf|ci|build|spec)(\(.+\))?: .+`
- [x] 5.3 Run `lefthook install` to register hooks in `.git/hooks/`
- [x] 5.4 Verify pre-commit hook fires by staging a file and running `git commit --dry-run` (or equivalent)

## 6. Vitest Configuration

- [x] 6.1 Add `vitest` and `@vitest/coverage-v8` as dev dependencies in `packages/core/` (`pnpm add -D vitest @vitest/coverage-v8`)
- [x] 6.2 Create `packages/core/vitest.config.ts` with: `pool: 'forks'`, include patterns for `test/unit/**/*.test.ts` and `test/integration/**/*.test.ts` only (NOT e2e), coverage config excluding `test/`, `fixtures/`, `dist/`, and config files
- [x] 6.3 Create a separate `packages/core/vitest.config.e2e.ts` using `defineConfig` (NOT `mergeConfig` — `mergeConfig` concatenates `include` arrays, causing unit/integration tests to run under the E2E suite); include only `test/e2e/**/*.test.ts`, set `pool: 'forks'`, and reference a `globalSetup` file that runs `pnpm -F @skillet/core build` before tests; the `test:e2e` script SHALL use `vitest run --config vitest.config.e2e.ts` so the pre-build only runs when E2E is explicitly invoked
- [x] 6.4 Add scripts to `packages/core/package.json`: `test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`
- [x] 6.5 Create `test/unit/.gitkeep`, `test/integration/helpers/.gitkeep`, `test/e2e/helpers/.gitkeep` to scaffold the directory tree
- [x] 6.6 Write a smoke test at `test/unit/smoke.test.ts` that asserts `1 + 1 === 2` and run `pnpm test:unit` to confirm the test harness works end-to-end

## 7. Sandbox Helper

- [x] 7.1 Add `@types/node` as a dev dependency in `packages/core/`
- [x] 7.2 Implement `createSandbox()` in `test/integration/helpers/sandbox.ts`: `mkdtemp`, create `home/` and `project/` subdirs, set `HOME` and `USERPROFILE`, call `process.chdir`, return `{ root, home, cwd }` with `Symbol.asyncDispose` cleanup
- [x] 7.3 Write a test at `test/integration/helpers/sandbox.test.ts` that verifies: sandbox creates the directory tree, `process.env.HOME` is updated, cleanup deletes the root, and the sandbox home is not the real home directory

## 8. Unit Tests

- [x] 8.1 Write `test/unit/hash.test.ts` (all scenarios from spec): deterministic hash, rename detection, `\r\n` normalisation, backslash normalisation, `.skill-manifest.json` exclusion, custom ignore list — mark all tests as `todo` initially (red phase), then implement once `hashSkill` is built
- [x] 8.2 Write `test/unit/normalize.test.ts` (all scenarios from spec): valid parse, missing name, missing description, missing file, optional version, frontmatter passthrough — mark as `todo` initially
- [x] 8.3 Write `test/unit/registry.test.ts` (all scenarios from spec): register/get/list, duplicate rejection, `registerAdapter` alias — mark as `todo` initially
- [x] 8.4 Write `test/unit/adapter-claude.test.ts`, `adapter-copilot.test.ts`, `adapter-agents.test.ts` (all scenarios from spec) — mark as `todo` initially
- [x] 8.5 Write `test/unit/ui-colors.test.ts`, `ui-wordmark.test.ts`, `ui-verbs.test.ts` (all scenarios from spec) — mark as `todo` initially
- [x] 8.6 Run `pnpm test:unit` and confirm all todo tests are listed as pending (not failing)

## 9. Integration Test Scaffolding

- [x] 9.1 Add `cli-testing-library` (the `crutchcorn` variant — https://github.com/crutchcorn/cli-testing-library) as a dev dependency in `packages/core/` (`pnpm add -D cli-testing-library`); verify the installed package exports `render`, `findByText`, and `userEvent` before proceeding
- [x] 9.2 Write `test/integration/install.test.ts` with `test.each` parameterized across all 6 adapter × scope combinations (claude/user, claude/project, copilot/user, copilot/project, agents/user, agents/project); cover: fresh install, idempotent install, drift detection, stale detection, update flows, uninstall, hook ordering — mark all as `todo` initially
- [x] 9.3 Write `test/integration/manifest.test.ts` covering: all required `.skill-manifest.json` fields present, `postInstallHash` matches re-hash of installed folder — mark as `todo` initially
- [x] 9.4 Run `pnpm test:integration` and confirm all todo tests are listed as pending

## 10. E2E Test Scaffolding

- [x] 10.1 Implement `test/e2e/helpers/render-cli.ts`: wraps `cli-testing-library`'s `render()` with sandbox creation, `HOME`/`USERPROFILE` injection, and cleanup in teardown
- [x] 10.2 Write `test/e2e/install.test.ts` covering: golden path TTY install (scope prompt → target multi-select → spinner → done line), golden path non-TTY install, `list` showing pristine, edit → `list` showing modified, `update --force` restoring pristine, `NO_COLOR` suppressing ANSI, invalid `--target` exiting 1, non-TTY defaulting to `--yes` — mark all as `todo` initially
- [x] 10.3 Run `pnpm test:e2e` and confirm all todo tests are listed as pending (E2E suite runs, build step fires, no crashes)

## 11. GitHub Actions CI

- [x] 11.1 Create `.github/workflows/ci.yml` with:
  - `quality` job: `ubuntu-latest`, runs `pnpm lint` and `pnpm typecheck`
  - `unit` job: `ubuntu-latest`, runs `pnpm test:unit`
  - `integration` job: matrix `[ubuntu-latest, macos-latest, windows-latest]`, `fail-fast: false`, sets `LEFTHOOK: 0`, runs `pnpm test:integration`
  - `e2e` job: matrix `[ubuntu-latest, macos-latest, windows-latest]`, `fail-fast: false`, sets `LEFTHOOK: 0`, runs `pnpm test:e2e`
  - Node 24 and pnpm 11 pinned in all jobs via `actions/setup-node` and `pnpm/action-setup`
- [x] 11.2 Set `LEFTHOOK: 0` as an env var in all CI jobs to prevent Lefthook from writing git hooks during `pnpm install`
- [ ] 11.3 Push to a test branch and confirm `quality` and `unit` jobs pass; integration and e2e jobs run on all 3 platforms with `fail-fast: false`

## 12. GitHub Actions Release

- [x] 12.1 Create `.github/workflows/release.yml` triggered on tags `v*`; job steps: `pnpm install`, `pnpm -F @skillet/core build`, `pnpm -F @skillet/core prepublishOnly`, `npm publish --access public`; read `NPM_TOKEN` from repository secrets
- [x] 12.2 Add `prepublishOnly` script to `packages/core/package.json` that runs `pnpm build` only — tests are enforced by the CI gate (`workflow_run: conclusion == 'success'`) before the release workflow fires, so running them again in `prepublishOnly` would be redundant; the publish step uses `pnpm -F @skillet/core publish --access public --no-git-checks`
- [x] 12.3 Add `files` field to `packages/core/package.json` excluding `src/`, `test/`, `fixtures/`, and dev config files from the published artifact
- [x] 12.4 Verify `release.yml` YAML is valid by running `actionlint` or equivalent locally

## 13. CONTRIBUTING.md

- [x] 13.1 Write `CONTRIBUTING.md` at the repo root covering: prerequisites (Node 24+, pnpm 11+ with install links), setup steps (`pnpm install && lefthook install`), all scripts table (test, test:unit, test:integration, test:e2e, test:coverage, lint, format, build, typecheck), single-file test invocation example, conventional commits format with allowed prefixes and example, release process (version bump → commit → tag → auto-publish)
- [x] 13.2 Verify all scripts listed in `CONTRIBUTING.md` exist in `packages/core/package.json` and the root `package.json`
