## ADDED Requirements

### Requirement: @skillet-cli/ui is a private workspace package
`@skillet-cli/ui` SHALL be a TypeScript ESM package located at `packages/ui/` with `"private": true` and no `publishConfig`. It SHALL not be published to npm. It SHALL declare `"type": "module"` and `"engines": { "node": ">=24" }` consistent with other packages in the workspace.

#### Scenario: Package is private and not publishable
- **WHEN** `packages/ui/package.json` is read
- **THEN** `private` is `true` and there is no `publishConfig` field

#### Scenario: Package is correctly scoped
- **WHEN** `packages/ui/package.json` is read
- **THEN** `name` is `@skillet-cli/ui` and `type` is `module`

---

### Requirement: @skillet-cli/ui exports brand color tokens
`@skillet-cli/ui` SHALL export the canonical brand color tokens used across all `@skillet-cli/*` packages: `ember500`, `emberChar`, `ember400`, `irisBright`, `iris`, `basil`, `chili`, and `dim`.

#### Scenario: Color tokens are importable
- **WHEN** a consuming package imports `{ ember500, irisBright, basil } from '@skillet-cli/ui'`
- **THEN** the imports resolve to chalk color instances without error

---

### Requirement: @skillet-cli/ui exports a TTY/non-TTY spinner
`@skillet-cli/ui` SHALL export a `createSpinner(isTTY)` factory that returns a spinner with `start`, `succeed`, and `fail` methods. In TTY mode it SHALL animate in-place using ANSI escape sequences. In non-TTY mode it SHALL write plain text lines without escape sequences.

#### Scenario: TTY spinner clears line on succeed
- **WHEN** `createSpinner(true)` is used and `succeed()` is called
- **THEN** the in-progress line is cleared before the success line is written

#### Scenario: Non-TTY spinner writes plain lines
- **WHEN** `createSpinner(false)` is used and `succeed(label)` is called
- **THEN** `label + '\n'` is written to stdout without ANSI escape sequences

---

### Requirement: @skillet-cli/ui exports wordmark generation utilities
`@skillet-cli/ui` SHALL export `generateWordmark(name: string): string` and `deriveDisplayName(pkgName: string): string`. `generateWordmark` SHALL render the given name using figlet ANSI Shadow font with the ember gradient, falling back to plain bold text when the output would exceed terminal width. `deriveDisplayName` SHALL strip any `@scope/` prefix and uppercase the result.

#### Scenario: generateWordmark respects terminal width
- **WHEN** the rendered figlet output would exceed `process.stdout.columns`
- **THEN** `generateWordmark` returns the plain ember-bold name instead of the figlet art

#### Scenario: deriveDisplayName strips scope
- **WHEN** `deriveDisplayName('@skillet-cli/core')` is called
- **THEN** it returns `'CORE'`

---

### Requirement: @skillet-cli/ui exports a parameterized header factory
`@skillet-cli/ui` SHALL export `renderFullHeader(opts)` and `renderLightHeader(opts)` where `opts` includes a required `attributionLine: string` parameter. The attribution text SHALL NOT be hardcoded inside the package — each consumer provides its own copy. Both functions SHALL return an empty string in non-TTY and CI environments.

#### Scenario: Attribution is caller-supplied
- **WHEN** `renderFullHeader({ ..., attributionLine: 'Powered by MyTool v1.0' })` is called in a TTY
- **THEN** the output contains `'Powered by MyTool v1.0'`

#### Scenario: Header suppressed in CI
- **WHEN** `renderFullHeader` is called with `CI=true` in the environment
- **THEN** it returns an empty string

---

### Requirement: packages/core and packages/create both depend on @skillet-cli/ui
Both `packages/core` and `packages/create` SHALL declare `@skillet-cli/ui` as a `workspace:*` dependency in their `package.json`. All brand color, spinner, wordmark, and header imports in those packages SHALL resolve through `@skillet-cli/ui` rather than local paths.

#### Scenario: Core resolves UI imports via workspace package
- **WHEN** `packages/core` is built
- **THEN** all former `./ui/colors.js`, `./ui/spinner.js`, `./ui/wordmark.js`, and `./ui/header.js` imports resolve through `@skillet-cli/ui` without error

#### Scenario: Build order is respected
- **WHEN** the workspace build is run
- **THEN** `packages/ui` is built before `packages/core` and `packages/create`
