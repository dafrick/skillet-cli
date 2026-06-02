## ADDED Requirements

### Requirement: CONTRIBUTING.md documents prerequisites
`CONTRIBUTING.md` SHALL list the required tools and versions a contributor needs before setting up the repo: Node.js 20+ and pnpm 9+. Links to installation pages SHALL be included.

#### Scenario: Prerequisites are clearly stated
- **WHEN** a new contributor reads CONTRIBUTING.md
- **THEN** they can identify exactly which tools to install and at which minimum versions before cloning

---

### Requirement: CONTRIBUTING.md documents the setup steps
`CONTRIBUTING.md` SHALL document the exact commands to get a working development environment after cloning:
1. `pnpm install` — installs all workspace dependencies
2. `lefthook install` — registers git hooks

#### Scenario: Setup steps are complete and ordered
- **WHEN** a contributor follows the setup steps in order on a clean clone
- **THEN** they have a working dev environment with hooks active and can run tests without additional steps

---

### Requirement: CONTRIBUTING.md documents all available scripts
`CONTRIBUTING.md` SHALL document every npm script a contributor may need, with a one-line description of each:

| Script | Command | Description |
|---|---|---|
| `pnpm test` | vitest (all layers) | Run unit + integration + E2E tests |
| `pnpm test:unit` | vitest unit | Fast; use during TDD |
| `pnpm test:integration` | vitest integration | Filesystem tests with HOME sandbox |
| `pnpm test:e2e` | vitest e2e | Real pty; requires prior build |
| `pnpm test:coverage` | vitest --coverage | Coverage report in text/JSON/HTML |
| `pnpm lint` | biome check | Read-only lint; exits non-zero on violations |
| `pnpm format` | biome check --write | Format and lint; rewrites files |
| `pnpm build` | tsc | Compile TypeScript to dist/ |
| `pnpm typecheck` | tsc --noEmit | Type check without emitting |

#### Scenario: All scripts are documented
- **WHEN** a contributor reads the scripts section of CONTRIBUTING.md
- **THEN** every script defined in `packages/core/package.json` has a corresponding entry with a description

---

### Requirement: CONTRIBUTING.md documents how to run a single test file
`CONTRIBUTING.md` SHALL include a concrete example of running a single Vitest test file by path, e.g.:
```
pnpm vitest run packages/core/test/unit/hash.test.ts
```

#### Scenario: Single-file invocation is shown
- **WHEN** a contributor wants to run only the hash tests
- **THEN** CONTRIBUTING.md provides a copy-pasteable command they can adapt to any test file path

---

### Requirement: CONTRIBUTING.md documents the conventional commits format
`CONTRIBUTING.md` SHALL document the commit message format enforced by the `commit-msg` hook, including the allowed type prefixes (`feat`, `fix`, `chore`, `test`, `docs`, `refactor`, `perf`, `ci`, `build`, `spec`) and a valid example.

#### Scenario: Commit format is explained with an example
- **WHEN** a contributor reads the commits section
- **THEN** they see the allowed prefixes and at least one example such as `feat(core): add install command`

---

### Requirement: CONTRIBUTING.md documents the release process
`CONTRIBUTING.md` SHALL document the release process for maintainers:
1. Ensure `main` is passing CI
2. Bump the version in `packages/core/package.json`
3. Commit with `chore(release): vX.Y.Z`
4. Create and push a git tag `vX.Y.Z`
5. The `release.yml` GitHub Actions workflow publishes to npm automatically

#### Scenario: Release steps are unambiguous
- **WHEN** a maintainer follows the release steps
- **THEN** the process produces a published npm package without requiring any manual `npm publish` invocation

---

### Requirement: CONTRIBUTING.md documents local build and manual testing
`CONTRIBUTING.md` SHALL include a "Local Build & Manual Testing" section that explains how to build the package, smoke-test the CLI, iterate with watch mode, and test against a local skill project using `pnpm link`.

#### Scenario: Contributor can smoke-test the CLI
- **WHEN** a contributor reads the local build section and runs `make run`
- **THEN** the CLI is built and prints its help output without requiring any additional configuration

#### Scenario: Contributor can iterate with watch mode
- **WHEN** a contributor reads the watch mode instructions
- **THEN** they can run `make watch` in one terminal and `make run` in another to get automatic recompilation on save

#### Scenario: Contributor can test against a real skill project
- **WHEN** a contributor reads the local linking instructions
- **THEN** they can link their local build into a skill project using `pnpm link --global` without re-linking after each build
