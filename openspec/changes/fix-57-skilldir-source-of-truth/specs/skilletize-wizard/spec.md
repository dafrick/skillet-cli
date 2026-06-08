## MODIFIED Requirements

### Requirement: Wizard generates a `bin/cli.js` that reads skill location from `package.json`
The generated `bin/cli.js` SHALL call `run({ pkg })` with no `skillDir` argument. It SHALL NOT embed any path to the skill directory. The skill location SHALL be resolved at runtime by `@skillet-cli/core` from `package.json`'s `skillet.skillDir` field.

#### Scenario: Generated `bin/cli.js` contains no skillDir argument
- **WHEN** the wizard completes and `bin/cli.js` is written
- **THEN** the file calls `await run({ pkg })` with no `skillDir` property

#### Scenario: Generated `bin/cli.js` contains no URL or path resolution
- **WHEN** the wizard completes and `bin/cli.js` is written
- **THEN** the file does not import `fileURLToPath` or use `new URL(...)` for path resolution

#### Scenario: `package.json` is the source of truth after wizard completes
- **WHEN** the wizard has run and `package.json` contains `skillet.skillDir` and `bin/cli.js` contains `await run({ pkg })`
- **THEN** running `npx . install` succeeds, reading skill location from `package.json`

## MODIFIED Requirements

### Requirement: Post-move step updates `package.json` only — no binary rewrite
After files are moved into `skill/`, the wizard SHALL update `skillet.skillDir` in `package.json` to reflect the new location. The wizard SHALL NOT rewrite `bin/cli.js` after the move step. Since the binary no longer embeds a path, it remains valid across all file-move outcomes.

#### Scenario: `bin/cli.js` is not modified after the file-move step
- **WHEN** the user confirms the file move and files are moved into `skill/`
- **THEN** `bin/cli.js` is not rewritten; its content is identical to what was written during scaffold

#### Scenario: `package.json` `skillet.skillDir` is updated after the file-move step
- **WHEN** files are moved into `skill/`
- **THEN** `npm pkg set skillet.skillDir=./skill/` is run and the package.json field is updated
