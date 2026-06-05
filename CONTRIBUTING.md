# Contributing to Skillet

## Prerequisites

> **Note:** If you use the dev container (see [Dev Container](#dev-container) below), you can skip this section — all prerequisites are handled automatically inside the container.

Before setting up the repo, install the following tools:

- **Node.js 24+** — [nodejs.org/en/download](https://nodejs.org/en/download)
- **pnpm 11+** — [pnpm.io/installation](https://pnpm.io/installation)
- **lefthook** — [lefthook.dev](https://lefthook.dev) (git hooks manager)

## Dev Container

The recommended development environment is the included dev container — it comes with Node 24, pnpm, the GitHub CLI, and Claude Code pre-configured. See [`.devcontainer/README.md`](.devcontainer/README.md) for setup instructions.

## Setup

After cloning the repository, run:

```sh
pnpm install
lefthook install
```

This installs all workspace dependencies and registers the git hooks.

## Scripts

Root-level scripts run across all packages. Per-package scripts can also be run from inside `packages/core/`, `packages/create/`, or `packages/ui/`.

| Script | Description |
|---|---|
| `pnpm build` | Build all packages in dependency order (ui → core → create) |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Read-only lint; exits non-zero on violations |
| `pnpm format` | Format and lint; rewrites files |
| `pnpm test:unit` | Fast unit tests across all packages; use during TDD |
| `pnpm test:integration` | Filesystem tests with HOME sandbox |
| `pnpm test:e2e` | Real process spawning; requires prior build |

`packages/core` also has `pnpm test:coverage` for a coverage report.

### Running a single test file

```sh
pnpm --filter @skillet-cli/core exec vitest run test/unit/hash.test.ts
pnpm --filter create-skillet exec vitest run test/unit/detect.test.ts
```

Adapt the filter and path to the package and test file you want.

## Local Build & Manual Testing

A `Makefile` in `packages/core/` abstracts common commands. Run `make <target>` from that directory.

| Target | Description |
|---|---|
| `make build` | Compile TypeScript to `dist/` |
| `make clean` | Remove `dist/` and `coverage/` |
| `make watch` | Recompile on save (TypeScript watch mode) |

### Smoke-test the core CLI against the built-in fixture

Build first, then invoke `bin/cli.js` directly:

```sh
make build && node bin/cli.js --help
make build && node bin/cli.js install
```

This runs the CLI against `fixtures/hello-skill` — no extra setup required. For a faster iteration loop, run `make watch` in one terminal to pick up saves automatically, then run `node bin/cli.js <command>` as needed.

### Smoke-test the create-skillet wizard

Build all packages first (ui must be built before create), then run the wizard in a temp directory:

```sh
pnpm build
mkdir /tmp/my-skill && cd /tmp/my-skill
node /path/to/repo/packages/create/bin/cli.js
```

### Test against a local skill project

To try your changes inside an actual skill project (one with its own `package.json` and `SKILL.md`), link the local build:

```sh
# from packages/core/
pnpm link --global

# from your skill project
pnpm link --global @skillet-cli/core
```

Run `make build` in this repo after each change — the linked package resolves straight to `dist/`, so no re-linking is needed.

## Commit Format

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` hook enforces this automatically.

**Allowed prefixes:** `feat`, `fix`, `chore`, `test`, `docs`, `refactor`, `perf`, `ci`, `build`, `spec`

**Format:** `<type>(<scope>): <description>`

**Example:**

```
feat(core): add install command
```

## Keeping READMEs in Sync

There are three user-facing READMEs:

- `packages/core/README.md` — appears on the `@skillet-cli/core` npm page; targets skill authors; covers `run()` API and RunOptions
- `packages/create/README.md` — appears on the `create-skillet` npm page; targets first-time users running `npm create skillet`
- `README.md` (root) — covers the same `run()` API in the "Building with @skillet-cli/core" section

When the public API changes — a new `RunOptions` field, a changed `run()` signature, or an updated minimal `bin/cli.js` example — **update both `packages/core/README.md` and the root `README.md`** in the same PR.

## Release Process

Each package is released independently using a prefixed tag. The tag triggers the corresponding workflow.

### Releasing `@skillet-cli/core`

1. Ensure `main` is passing CI
2. Bump the version in `packages/core/package.json`
3. Commit: `chore(release): core-vX.Y.Z`
4. Push the commit to `main`
5. Create and push the tag:

```sh
git tag core-vX.Y.Z
git push origin core-vX.Y.Z
```

The `release-core.yml` workflow publishes `@skillet-cli/core` to npm automatically.

### Releasing `create-skillet`

1. Ensure `main` is passing CI
2. Bump the version in `packages/create/package.json`
3. Commit: `chore(release): create-vX.Y.Z`
4. Push the commit to `main`
5. Create and push the tag:

```sh
git tag create-vX.Y.Z
git push origin create-vX.Y.Z
```

The `release-create.yml` workflow publishes `create-skillet` to npm automatically.
