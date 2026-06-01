## ADDED Requirements

### Requirement: Workspace root is a private pnpm package
The repo root SHALL contain a `package.json` with `"private": true` and no `name` field, and a `pnpm-workspace.yaml` declaring `packages: ["packages/*"]`. The root `package.json` SHALL define workspace-level scripts: `test`, `lint`, `format`, `build`, `typecheck`.

#### Scenario: Workspace is initialised
- **WHEN** a contributor runs `pnpm install` at the repo root
- **THEN** pnpm installs dependencies for all packages in `packages/*` and creates a single `pnpm-lock.yaml` at the root

#### Scenario: Root package is not publishable
- **WHEN** `npm publish` is run at the repo root
- **THEN** it fails because `"private": true` is set

---

### Requirement: Core package lives at packages/core
The `@skillet-cli/core` package SHALL live at `packages/core/` with its own `package.json` (`"name": "@skillet-cli/core"`, `"type": "module"`, `"engines": { "node": ">=18" }`), `tsconfig.json`, and `vitest.config.ts`. The `tsconfig.json` SHALL include `"lib": ["ESNext"]` to make `Symbol.asyncDispose` and the `await using` disposal pattern available — both are required by the `createSandbox()` test helper.

#### Scenario: Package is scoped correctly
- **WHEN** `packages/core/package.json` is read
- **THEN** `name` is `@skillet-cli/core` and `type` is `module`

#### Scenario: Node engine constraint is declared
- **WHEN** `packages/core/package.json` is read
- **THEN** `engines.node` is `">=18"`

---

### Requirement: Shared configuration files live at the repo root
Biome configuration (`biome.json`) and Lefthook configuration (`lefthook.yml`) SHALL live at the repo root so they cover all current and future packages without duplication.

#### Scenario: Biome covers all packages from root
- **WHEN** `biome check` is run from the repo root
- **THEN** it lints and checks formatting for files in `packages/` and any future workspace packages

#### Scenario: Lefthook hooks are registered from root
- **WHEN** `lefthook install` is run from the repo root
- **THEN** git hooks are written to `.git/hooks/` and apply to the entire repository

---

### Requirement: Test fixtures live inside the package
A minimal valid skill directory (`fixtures/hello-skill/`) SHALL live at `packages/core/fixtures/hello-skill/` containing a `SKILL.md` with valid `name` and `description` frontmatter and a non-empty markdown body. This fixture is used by all three test layers.

#### Scenario: Fixture is a valid skill
- **WHEN** `normalizeSkill('packages/core/fixtures/hello-skill')` is called
- **THEN** it returns a `NormalizedSkill` with `name`, `description`, and a non-empty `contentHash`

---

### Requirement: Test directories are co-located with the package
The `test/` directory SHALL live at `packages/core/test/` with three subdirectories: `unit/`, `integration/` (with `helpers/`), and `e2e/` (with `helpers/`).

#### Scenario: Test directory structure is present after setup
- **WHEN** the repo is cloned and `pnpm install` is run
- **THEN** `packages/core/test/unit/`, `packages/core/test/integration/helpers/`, and `packages/core/test/e2e/helpers/` all exist
