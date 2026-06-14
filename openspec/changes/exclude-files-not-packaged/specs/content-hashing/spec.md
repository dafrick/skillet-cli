## MODIFIED Requirements

### Requirement: Ignore set excludes noise files
The library SHALL exclude `.git`, `node_modules`, `.DS_Store`, and `.skill-manifest.json` from the hash computation by default. The ignore set SHALL be exported as `DEFAULT_IGNORE` so that other modules (e.g., the install copy step) can reference it without duplication.

#### Scenario: .git directory ignored
- **WHEN** the skill directory contains a `.git/` subdirectory
- **THEN** its contents do not affect the computed hash

#### Scenario: .skill-manifest.json ignored
- **WHEN** `.skill-manifest.json` is present in the skill directory
- **THEN** it is excluded from the hash so source and installed trees can be compared fairly

#### Scenario: DEFAULT_IGNORE is exported
- **WHEN** another module imports `DEFAULT_IGNORE` from the hashing module
- **THEN** the import resolves to the same Set used internally by `hashSkill`
