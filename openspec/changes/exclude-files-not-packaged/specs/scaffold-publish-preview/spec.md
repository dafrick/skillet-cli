## ADDED Requirements

### Requirement: NPM preview step lists files that will be published
The NPM preview step in the `create-skillet` wizard SHALL display the contents of the skill content directory that will be included in the published npm package, and SHALL note which entries (if any) are excluded because they match the standard ignore set (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`).

#### Scenario: Preview shows skill directory file tree
- **WHEN** the wizard reaches the NPM preview step and the skill content directory exists
- **THEN** the output lists the files and subdirectories inside the skill content directory that will be published

#### Scenario: Excluded entries noted in preview
- **WHEN** the skill content directory contains entries matching the standard ignore set (e.g., `node_modules/`)
- **THEN** the preview output notes those entries as excluded, so the user knows they will not be published

#### Scenario: Preview shown before confirmation prompt
- **WHEN** the NPM preview step is displayed
- **THEN** the file inclusion list appears before the confirmation prompt, giving the user full context before they commit

#### Scenario: Skill directory does not exist yet
- **WHEN** the wizard reaches the NPM preview step and the skill content directory does not yet exist on disk
- **THEN** the preview skips the file tree and instead notes that the directory will be created, without error
