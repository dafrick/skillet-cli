## MODIFIED Requirements

### Requirement: Execution uses only native npm commands
The wizard SHALL set up the npm package using only `npm init -y` and `npm pkg set` commands, plus direct file writes for `bin/cli.js`. It SHALL NOT write or overwrite `package.json` directly via `fs.writeFile` or `JSON.stringify`. When running `npm init -y`, the wizard SHALL pass `--init-license=<selected-license>` and `--init-type=module` so that the user-selected license and the correct module type are written directly by npm init; npm's defaults of ISC and commonjs are never persisted.

#### Scenario: No existing package.json
- **WHEN** no `package.json` exists before execution
- **THEN** the wizard runs `npm init -y --init-license=<selected-license> --init-type=module` to create one before running `npm pkg set` commands

#### Scenario: Existing package.json
- **WHEN** a `package.json` exists before execution
- **THEN** the wizard skips `npm init` and runs only `npm pkg set` commands

#### Scenario: All required fields are set
- **WHEN** execution completes successfully
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license` (set to the value the user selected in the wizard, e.g. `MIT` — not npm's default of `ISC`), `type: "module"` (not npm's default of `commonjs`), `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skillDir` (set to the skill content path), and a `bin` field with the package name pointing to `./bin/cli.js`

#### Scenario: Repository URL left blank
- **WHEN** the user leaves the repository URL prompt empty
- **THEN** the wizard skips `npm pkg set repository.url` and `npm pkg set repository.type` — neither field is written to `package.json`

#### Scenario: License field reflects user selection after fresh init
- **WHEN** no `package.json` exists before execution and the user selected `MIT` as the license
- **THEN** after execution completes, the `license` field in `package.json` is `"MIT"`, not `"ISC"`

#### Scenario: Type field is module after fresh init
- **WHEN** no `package.json` exists before execution
- **THEN** after execution completes, the `type` field in `package.json` is `"module"`, not `"commonjs"`
