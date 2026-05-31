# Contributing to Skillet

## Prerequisites

Before setting up the repo, install the following tools:

- **Node.js 24+** — [nodejs.org/en/download](https://nodejs.org/en/download)
- **pnpm 11+** — [pnpm.io/installation](https://pnpm.io/installation)
- **lefthook** — [lefthook.dev](https://lefthook.dev) (git hooks manager)

## Setup

After cloning the repository, run:

```sh
pnpm install
lefthook install
```

This installs all workspace dependencies and registers the git hooks.

## Scripts

All scripts can be run from the repo root or from `packages/core/`.

| Script | Description |
|---|---|
| `pnpm test` | Run unit + integration + E2E tests |
| `pnpm test:unit` | Fast; use during TDD |
| `pnpm test:integration` | Filesystem tests with HOME sandbox |
| `pnpm test:e2e` | Real pty; requires prior build |
| `pnpm test:coverage` | Coverage report in text/JSON/HTML |
| `pnpm lint` | Read-only lint; exits non-zero on violations |
| `pnpm format` | Format and lint; rewrites files |
| `pnpm build` | Compile TypeScript to dist/ |
| `pnpm typecheck` | Type check without emitting |

### Running a single test file

```sh
pnpm --filter @skillet/core exec vitest run test/unit/hash.test.ts
```

Adapt the path to any test file under `packages/core/test/`.

## Commit Format

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` hook enforces this automatically.

**Allowed prefixes:** `feat`, `fix`, `chore`, `test`, `docs`, `refactor`, `perf`, `ci`, `build`, `spec`

**Format:** `<type>(<scope>): <description>`

**Example:**

```
feat(core): add install command
```

## Release Process

1. Ensure `main` is passing CI
2. Bump the version in `packages/core/package.json`
3. Commit with `chore(release): vX.Y.Z`
4. Push the commit to `main`

```sh
git push origin main
```

5. Create and push a git tag `vX.Y.Z`

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

6. The `release.yml` GitHub Actions workflow publishes to npm automatically — no manual publish required
