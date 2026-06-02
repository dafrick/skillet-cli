## ADDED Requirements

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
- **THEN** tsc starts in `--watch --preserveWatchOutput` mode and recompile output accumulates in the terminal rather than being erased

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

## REMOVED Requirements

### ~~Requirement: Makefile provides a run target~~
The `run` target was removed. Local CLI testing is done directly via `node bin/cli.js` as documented in `CONTRIBUTING.md`. `make run` was removed because `pnpm exec <bin>` resolves globally installed versions rather than the local build when a published package is also installed, making it unreliable for development.
