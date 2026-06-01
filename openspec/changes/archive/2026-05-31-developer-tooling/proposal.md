## Why

`@skillet-cli/core` is a brand-new library with no existing codebase. Before a single line of implementation is written, the repo needs the tooling and test infrastructure that makes TDD possible from day one: a consistent code quality baseline, pre-commit safety nets, and a test architecture capable of verifying skill installation correctness across different agents, scopes (user vs project), and operating systems.

## What Changes

- **New monorepo layout** — pnpm workspace root at `skillet/` with `packages/core/` as the first package; scaffolded for future packages (`@skillet/cli`, fixture packages, etc.)
- **New Biome configuration** — single `biome.json` at repo root enforcing formatting, import hygiene, and the critical `noConsole` rule (all CLI output must go through the design system, not raw `console.log`)
- **New Lefthook hooks** — `pre-commit` runs Biome check + `tsc --noEmit` on staged files; `commit-msg` validates conventional commits format
- **New three-layer test architecture** — unit (pure functions), integration (direct function calls with `HOME`-overridden sandbox), and E2E (`cli-testing-library` with real pty for TTY and interactive prompt coverage)
- **New test sandbox helper** — `createSandbox()` overrides `HOME`/`USERPROFILE` to an isolated `mkdtemp()` directory so no test ever touches a real `~/.claude/`, `.github/`, or `.agents/` path
- **New GitHub Actions workflows** — `ci.yml` with quality, unit, integration, and E2E jobs; integration and E2E run a 3-platform matrix (ubuntu, macos, windows); `release.yml` publishes to npm on version tags
- **New `CONTRIBUTING.md`** — documents prerequisites, setup steps, all available scripts, how to run a single test file, conventional commits reference, and the release process

## Capabilities

### New Capabilities

- `monorepo-setup`: pnpm workspace root layout, `packages/core/` scaffolding, shared config placement, and workspace-aware script routing
- `code-quality-toolchain`: Biome formatter + linter configuration and Lefthook pre-commit / commit-msg hooks wired into the contributor workflow
- `test-infrastructure`: three-layer Vitest architecture — unit (pure functions), integration (direct calls with HOME sandbox, parameterized across adapter × scope), and E2E (`cli-testing-library` real-pty for TTY/interactive prompt coverage) — including the shared `createSandbox()` isolation helper and fixture skill
- `ci-cd-pipeline`: GitHub Actions `ci.yml` (quality + unit on Linux; integration + E2E on 3-platform matrix) and `release.yml` (tag-triggered npm publish)
- `contributor-docs`: `CONTRIBUTING.md` covering prerequisites, setup, scripts, single-file test invocation, conventional commits, and release process

### Modified Capabilities

## Impact

- **New files at repo root**: `package.json` (workspace), `pnpm-workspace.yaml`, `biome.json`, `lefthook.yml`, `CONTRIBUTING.md`
- **New directory**: `packages/core/` with `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/`, `test/unit/`, `test/integration/`, `test/e2e/`, `fixtures/hello-skill/`
- **New directory**: `.github/workflows/` with `ci.yml` and `release.yml`
- **New dependencies (dev)**: `@biomejs/biome`, `lefthook`, `vitest`, `@vitest/coverage-v8`, `cli-testing-library`, `typescript`, `@types/node`
- **No existing code modified** — this is pure greenfield infrastructure; no prior codebase exists to migrate
