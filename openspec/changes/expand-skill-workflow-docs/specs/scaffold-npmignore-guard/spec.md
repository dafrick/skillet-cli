## ADDED Requirements

### Requirement: Scaffold skips .npmignore write when file already exists
The `executeScaffold` function SHALL check whether `.npmignore` exists in the target directory before writing it. If `.npmignore` already exists, the write SHALL be skipped entirely and the existing file content SHALL be preserved unchanged.

#### Scenario: .npmignore does not exist — write proceeds
- **WHEN** `executeScaffold` runs and no `.npmignore` exists in the current working directory
- **THEN** `.npmignore` is created containing `**/node_modules`

#### Scenario: .npmignore exists — write is skipped
- **WHEN** `executeScaffold` runs and `.npmignore` already exists in the current working directory
- **THEN** `fsp.writeFile` is NOT called for `.npmignore` and the file is left unchanged

#### Scenario: .npmignore with custom entries is preserved on re-run
- **WHEN** `.npmignore` exists containing custom entries (e.g., `*.log` and `dist/`) added via `create-skillet check` interactive triage
- **AND** `create-skillet` is run again
- **THEN** `.npmignore` still contains the custom entries unchanged after the wizard completes
