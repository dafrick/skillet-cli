## ADDED Requirements

### Requirement: Makefile provides a build target
The repo root SHALL contain a `Makefile` with a `build` target that compiles TypeScript to `dist/`.

#### Scenario: Build succeeds
- **WHEN** a contributor runs `make build` from the repo root
- **THEN** TypeScript is compiled and `packages/core/dist/` is populated

---

### Requirement: Makefile provides a clean target
The `Makefile` SHALL include a `clean` target that removes `packages/core/dist/` and `packages/core/coverage/`.

#### Scenario: Clean removes generated output
- **WHEN** a contributor runs `make clean`
- **THEN** `dist/` and `coverage/` are deleted and absent from the filesystem

---

### Requirement: Makefile provides a run target
The `Makefile` SHALL include a `run` target that builds the package and runs the CLI with `--help`, confirming the binary starts correctly.

#### Scenario: Run exits zero after a clean build
- **WHEN** a contributor runs `make run`
- **THEN** the package is built and the CLI prints help text and exits 0

---

### Requirement: Makefile provides a watch target
The `Makefile` SHALL include a `watch` target that starts TypeScript in watch mode, recompiling on file save.

#### Scenario: Watch starts the compiler in watch mode
- **WHEN** a contributor runs `make watch`
- **THEN** tsc starts in `--watch` mode and recompiles on source changes

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
