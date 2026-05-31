## ADDED Requirements

### Requirement: Biome enforces formatting across the monorepo
A single `biome.json` at the repo root SHALL configure the Biome formatter with 2-space indentation, single quotes, and a 100-character line width. The formatter SHALL run via `pnpm format` (which executes `biome check --write`) and via the Lefthook `pre-commit` hook on staged files.

#### Scenario: Formatting is applied on format command
- **WHEN** `pnpm format` is run at the repo root
- **THEN** Biome rewrites all files in `packages/` to conform to the configured style (2-space indent, single quotes, 100-char line width)

#### Scenario: Malformatted staged file is caught pre-commit
- **WHEN** a contributor stages a file with wrong indentation and runs `git commit`
- **THEN** the Lefthook `pre-commit` hook runs `biome check --write` on staged files and reformats them before the commit proceeds

---

### Requirement: Biome linter enforces project-specific rules
The Biome linter SHALL be configured with the `recommended` ruleset plus the following additional rules enabled as errors, each nested under their correct Biome category:
- `linter.rules.suspicious.noConsole` — raw `console.log`, `console.warn`, `console.error` are forbidden in `src/**`; all CLI output MUST go through the `ui/` design system
- `linter.rules.style.useImportType` — `import type` MUST be used for type-only imports
- `linter.rules.style.useNodejsImportProtocol` — all Node built-in imports MUST use the `node:` prefix (e.g. `node:fs`, `node:path`, `node:crypto`)

The `noConsole` rule SHALL be disabled in `test/**` via Biome's `overrides` key.

#### Scenario: Raw console call in src is rejected
- **WHEN** `pnpm lint` is run after adding `console.log('debug')` to a file in `src/`
- **THEN** Biome exits with a non-zero code and reports a `noConsole` violation

#### Scenario: console is allowed in test files
- **WHEN** `pnpm lint` is run with `console.log` present in `test/unit/hash.test.ts`
- **THEN** Biome exits 0 and reports no `noConsole` violation for that file

#### Scenario: Bare Node import is rejected
- **WHEN** `pnpm lint` is run after adding `import fs from 'fs'` to a source file
- **THEN** Biome exits with a non-zero code and reports a `useNodejsImportProtocol` violation

#### Scenario: Type-only import without import type is rejected
- **WHEN** `pnpm lint` is run after adding `import { Adapter } from './adapter.js'` where `Adapter` is only used as a type
- **THEN** Biome exits with a non-zero code and reports a `useImportType` violation

---

### Requirement: Biome organises imports automatically
Biome's import organiser SHALL be enabled using the Biome v2 `assist` configuration key: `assist.actions.source.organizeImports: "on"`. Imports SHALL be auto-sorted when `pnpm format` or `biome check --write` is run. (Note: the Biome v1 top-level `organizeImports` key is not valid in v2 and is silently ignored.)

#### Scenario: Unsorted imports are sorted on format
- **WHEN** a file has imports in non-alphabetical order and `pnpm format` is run
- **THEN** Biome rewrites the file with imports in sorted order

---

### Requirement: Lefthook runs pre-commit checks on staged files
`lefthook.yml` SHALL define a `pre-commit` hook that runs two commands in sequence:
1. `biome check --write {staged_files}` — formats and lints only staged files; Lefthook substitutes `{staged_files}` with the list of staged file paths, scoping Biome to changed files only. (Note: `--changed` is a Biome VCS integration flag that requires additional `vcs` config in `biome.json` and is not the correct approach here.)
2. `tsc --noEmit -p packages/core/tsconfig.json` — type-checks the core package using its own tsconfig; running bare `tsc --noEmit` at the repo root would fail because there is no root-level `tsconfig.json`.

Both commands MUST pass for the commit to proceed.

#### Scenario: Type error blocks commit
- **WHEN** a contributor stages a file with a TypeScript type error and runs `git commit`
- **THEN** the `tsc --noEmit -p packages/core/tsconfig.json` step exits non-zero and the commit is rejected with a type error message

#### Scenario: Clean commit passes hooks
- **WHEN** all staged files are well-typed and Biome-clean
- **THEN** both hook commands exit 0 and the commit proceeds

---

### Requirement: Lefthook validates conventional commit messages
`lefthook.yml` SHALL define a `commit-msg` hook that validates the commit message against the pattern `^(feat|fix|chore|test|docs|refactor|perf|ci|build|spec)(\(.+\))?: .+`.

#### Scenario: Non-conventional message is rejected
- **WHEN** a contributor runs `git commit -m "updated stuff"`
- **THEN** the `commit-msg` hook exits non-zero and the commit is rejected

#### Scenario: Conventional message is accepted
- **WHEN** a contributor runs `git commit -m "feat(core): add install command"`
- **THEN** the `commit-msg` hook exits 0 and the commit proceeds

---

### Requirement: Lint and typecheck are available as standalone scripts
`pnpm lint` SHALL run `biome check` (read-only, exits non-zero on violations). `pnpm typecheck` SHALL run `tsc --noEmit`. Both SHALL be runnable independently of the pre-commit hook (e.g. in CI or during development).

#### Scenario: Lint script exits non-zero on violations
- **WHEN** `pnpm lint` is run with a `noConsole` violation present
- **THEN** the command exits with a non-zero code and prints the violation location

#### Scenario: Typecheck script catches errors without emitting files
- **WHEN** `pnpm typecheck` is run with a type error present
- **THEN** the command exits non-zero, prints the error, and produces no output files in `dist/`
