## MODIFIED Requirements

### Requirement: Execution uses only native npm commands
The wizard SHALL set up the npm package using only `npm init -y` and `npm pkg set` commands, plus direct file writes for `bin/cli.js`. It SHALL NOT write or overwrite `package.json` directly via `fs.writeFile` or `JSON.stringify`. For multi-skill packages, `npm pkg set skillet.skills=<value>` SHALL be used instead of `npm pkg set skillet.skillDir=<value>`. When `description` or `author` is empty (the user pressed Enter without typing a value), those fields SHALL be omitted from the `npm pkg set` call entirely — the field is left at whatever value `npm init -y` wrote (or absent if no `npm init` ran). When `repositoryUrl` is empty, `repository.url` and `repository.type` SHALL likewise be omitted (existing behaviour, unchanged).

#### Scenario: No existing package.json
- **WHEN** no `package.json` exists before execution
- **THEN** the wizard runs `npm init -y` to create one before running `npm pkg set` commands

#### Scenario: Existing package.json
- **WHEN** a `package.json` exists before execution
- **THEN** the wizard skips `npm init` and runs only `npm pkg set` commands

#### Scenario: All required fields are set — single-skill
- **WHEN** execution completes for a single-skill package and the user supplied non-empty values for all prompts
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license`, `type: "module"`, `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skillDir` (set to the skill content path), and a `bin` field with the package name pointing to `./bin/cli.js`

#### Scenario: All required fields are set — multi-skill
- **WHEN** execution completes for a multi-skill package and the user supplied non-empty values for all prompts
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license`, `type: "module"`, `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skills` (set to the parent directory or JSON array), and a `bin` field — and does NOT contain `skillet.skillDir`

#### Scenario: Repository URL left blank
- **WHEN** the user leaves the repository URL prompt empty
- **THEN** the wizard skips `npm pkg set repository.url` and `npm pkg set repository.type` — neither field is written to `package.json`

#### Scenario: Description left blank
- **WHEN** the user leaves the description prompt empty (presses Enter without typing a value)
- **THEN** the wizard does NOT include `description=` in the `npm pkg set` argument list — the field retains whatever value `npm init -y` wrote (typically an empty string) and the wizard does NOT crash

#### Scenario: Author left blank
- **WHEN** the user leaves the author prompt empty (presses Enter without typing a value)
- **THEN** the wizard does NOT include `author=` in the `npm pkg set` argument list — the field retains whatever value `npm init -y` wrote and the wizard does NOT crash
