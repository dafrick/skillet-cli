## ADDED Requirements

### Requirement: npm init stdout is suppressed during package initialization
When the wizard runs `npm init -y` to create a new `package.json`, the command's stdout SHALL be captured (not forwarded to the terminal). The "Wrote to <path>/package.json:" block that npm prints SHALL NOT appear in the terminal output. npm's stderr SHALL remain inherited so that error messages still reach the terminal.

#### Scenario: npm init stdout does not appear in terminal
- **WHEN** the wizard runs `npm init -y` in a directory with no existing `package.json`
- **THEN** the "Wrote to" line and the default JSON block printed by npm are not visible in terminal output

#### Scenario: npm init stderr is still inherited
- **WHEN** `npm init -y` produces output on stderr (e.g., warnings or errors)
- **THEN** that stderr output is still forwarded to the terminal

---

### Requirement: Final package.json content is printed after all pkg set commands complete
After all `npm pkg set` commands have run and the package fields are in their final configured state, the wizard SHALL read `package.json` from disk and print its full content to stdout with a label `package.json written:`. This output SHALL appear before the bin/cli.js creation step.

#### Scenario: Displayed package.json matches configured values
- **WHEN** the wizard completes the seasoning step (all npm pkg set commands)
- **THEN** the terminal output includes the final `package.json` content, showing the user-configured values for name, version, description, author, license, and type (not npm's defaults)

#### Scenario: Displayed version matches user input
- **WHEN** the user configures version as `0.1.0`
- **THEN** the printed package.json shows `"version": "0.1.0"`, not `"version": "1.0.0"`

#### Scenario: Displayed license matches user input
- **WHEN** the user configures license as `MIT`
- **THEN** the printed package.json shows `"license": "MIT"`, not `"license": "ISC"`

#### Scenario: Displayed type matches configured value
- **WHEN** the wizard completes the seasoning step
- **THEN** the printed package.json shows `"type": "module"`, not `"type": "commonjs"`

#### Scenario: Displayed author matches user input
- **WHEN** the user configures author as `Name <email>`
- **THEN** the printed package.json shows the configured author value, not an empty string
