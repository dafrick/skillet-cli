## Purpose

Provides Makefile targets that abstract common development operations for contributors, covering build, clean, watch, test, lint, typecheck, and devcontainer management.
## Requirements
### Requirement: Makefile lives in packages/core/ and provides a build target
`packages/core/` SHALL contain a `Makefile` with a `build` target that compiles TypeScript to `dist/`.

#### Scenario: Build succeeds
- **WHEN** a contributor runs `make build` from `packages/core/`
- **THEN** TypeScript is compiled and `packages/core/dist/` is populated

---

### Requirement: Makefile provides a clean target
The `Makefile` SHALL include a `clean` target that removes `dist/` and `coverage/` relative to `packages/core/`.

#### Scenario: Clean removes generated output
- **WHEN** a contributor runs `make clean` from `packages/core/`
- **THEN** `dist/` and `coverage/` are deleted and absent from the filesystem

---

### Requirement: Makefile provides a watch target with preserved output
The `Makefile` SHALL include a `watch` target that starts TypeScript in watch mode with `--preserveWatchOutput`, so recompile output is visible rather than being cleared by tsc's default terminal-clearing behavior.

#### Scenario: Watch starts the compiler in watch mode
- **WHEN** a contributor runs `make watch`
- **THEN** tsc starts in `--watch --preserveWatchOutput` mode and recompile output accumulates in the terminal

---

### Requirement: Makefile provides test targets
The `Makefile` SHALL include targets `test`, `test-unit`, `test-integration`, `test-e2e`, and `test-coverage` corresponding to the equivalent pnpm scripts.

#### Scenario: test-unit runs unit tests
- **WHEN** a contributor runs `make test-unit`
- **THEN** only unit tests execute and the process exits 0 on success

---

### Requirement: Makefile provides lint, format, and typecheck targets
The `Makefile` SHALL include `lint`, `format`, and `typecheck` targets delegating to the equivalent pnpm scripts.

#### Scenario: lint exits non-zero on violations
- **WHEN** a contributor runs `make lint` and the codebase has lint violations
- **THEN** the process exits non-zero

#### Scenario: typecheck exits zero on a clean codebase
- **WHEN** a contributor runs `make typecheck` on a type-correct codebase
- **THEN** the process exits 0 with no output

---

### Requirement: Local CLI testing uses node bin/cli.js directly
Contributors SHALL invoke the CLI directly via `node bin/cli.js` for local testing rather than via `pnpm exec <bin>`. `CONTRIBUTING.md` SHALL document this pattern. No `make run` target exists.

#### Scenario: Contributor smoke-tests the CLI
- **WHEN** a contributor runs `make build && node bin/cli.js --help` from `packages/core/`
- **THEN** the CLI prints help text and exits 0

### Requirement: Makefile provides a devcontainer-build target
The `Makefile` SHALL include a `devcontainer-build` target that builds the dev container image locally using `@devcontainers/cli`, without pushing to any registry.

#### Scenario: Image is built locally
- **WHEN** a contributor runs `make devcontainer-build`
- **THEN** Docker pulls the pre-built base image and applies devcontainer features; the resulting image is available in the local Docker daemon

#### Scenario: Build does not push to a registry
- **WHEN** a contributor runs `make devcontainer-build`
- **THEN** no image is pushed to any remote registry

---

### Requirement: Makefile provides a devcontainer-open target
The `Makefile` SHALL include a `devcontainer-open` target that opens the project in VS Code using the dev container, building the image first if it does not exist.

#### Scenario: VS Code opens in container
- **WHEN** a contributor runs `make devcontainer-open`
- **THEN** VS Code opens with the project inside the running dev container

---

### Requirement: Makefile provides a devcontainer-rebuild target
The `Makefile` SHALL include a `devcontainer-rebuild` target that forces a full rebuild of the container image with no Docker cache.

#### Scenario: Rebuild ignores cache
- **WHEN** a contributor runs `make devcontainer-rebuild`
- **THEN** Docker builds the image from scratch, ignoring any cached layers

