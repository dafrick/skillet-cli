## ADDED Requirements

### Requirement: UI package lives at packages/ui
The `@skillet-cli/ui` package SHALL live at `packages/ui/` with its own `package.json` (`"name": "@skillet-cli/ui"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=24" }`), `tsconfig.json`, and `vitest.config.ts`. It SHALL be included in the pnpm workspace via the existing `packages/*` glob — no change to `pnpm-workspace.yaml` is required.

#### Scenario: UI package is discovered by pnpm workspace
- **WHEN** `pnpm install` is run at the repo root after `packages/ui/` is created
- **THEN** pnpm links `@skillet-cli/ui` as a workspace package and it is resolvable by other packages in the workspace

#### Scenario: UI package is not publishable
- **WHEN** `npm publish` is run from `packages/ui/`
- **THEN** it fails because `"private": true` is set

---

### Requirement: Create package lives at packages/create
The `create-skillet` package SHALL live at `packages/create/` with its own `package.json` (`"name": "create-skillet"`, `"type": "module"`, `"engines": { "node": ">=24" }`), `tsconfig.json`, `tsup.config.ts`, and `vitest.config.ts`. It SHALL declare `@skillet-cli/ui` as a `workspace:*` **devDependency** — the UI package is bundled into the create package's dist output via tsup's `noExternal` setting and does not appear in the published runtime dependencies.

#### Scenario: Create package is scoped correctly
- **WHEN** `packages/create/package.json` is read
- **THEN** `name` is `create-skillet` and `type` is `module`

#### Scenario: Create package bundles shared UI at build time
- **WHEN** `packages/create/package.json` is read
- **THEN** `devDependencies` includes `@skillet-cli/ui` with value `workspace:*` and `dependencies` does NOT include `@skillet-cli/ui`

#### Scenario: Create package dist includes bundled UI code
- **WHEN** `packages/create` is built with tsup
- **THEN** the dist output contains inlined code from `@skillet-cli/ui` and does not reference it as an external module
