## ADDED Requirements

### Requirement: Scaffold writes .npmignore only when absent
The `create-skillet` scaffold step SHALL write `.npmignore` (containing `**/node_modules`) only when `.npmignore` does not already exist in the current directory. If `.npmignore` already exists, the scaffold SHALL leave it unchanged. This preserves any exclusions the author added via `create-skillet check` interactive triage or manually.

#### Scenario: .npmignore created on first scaffold run
- **WHEN** no `.npmignore` exists in the current directory and `create-skillet` is run
- **THEN** a `.npmignore` file is created containing `**/node_modules`

#### Scenario: .npmignore preserved on scaffold re-run
- **WHEN** a `.npmignore` already exists (e.g., with entries added by `create-skillet check`) and `create-skillet` is re-run
- **THEN** the existing `.npmignore` is left unchanged; no content is overwritten or reset

#### Scenario: Custom exclusions survive scaffold re-run
- **WHEN** `.npmignore` contains `scripts/` (added by the author or via `create-skillet check`) and `create-skillet` is re-run
- **THEN** `.npmignore` still contains `scripts/` after the scaffold step completes
