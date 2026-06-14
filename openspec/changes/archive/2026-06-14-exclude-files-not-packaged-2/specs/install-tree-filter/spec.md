## ADDED Requirements

### Requirement: Install copy excludes noise entries
The library SHALL exclude `.git`, `node_modules`, `.DS_Store`, and `.skill-manifest.json` from the directory tree copied during install, using the same ignore set as content hashing.

#### Scenario: .git directory not copied
- **WHEN** the skill source directory contains a `.git/` subdirectory
- **THEN** the installed directory does not contain a `.git/` directory

#### Scenario: node_modules not copied
- **WHEN** the skill source directory contains a `node_modules/` directory
- **THEN** the installed directory does not contain `node_modules/`

#### Scenario: .DS_Store not copied
- **WHEN** the skill source directory contains one or more `.DS_Store` files (at any nesting level)
- **THEN** no `.DS_Store` files appear in the installed directory

#### Scenario: .skill-manifest.json not copied from source
- **WHEN** the skill source directory contains a `.skill-manifest.json` file
- **THEN** the installed directory does not contain a `.skill-manifest.json` sourced from the copy step (the manifest written after copy is not affected)

#### Scenario: Non-ignored files are still copied
- **WHEN** the skill directory contains files not in the ignore set
- **THEN** all such files are present in the installed directory with their relative paths preserved

### Requirement: Install filter uses the same ignore set as content hashing
The install-time filter SHALL reference `DEFAULT_IGNORE` exported from the hashing module rather than defining its own list, ensuring hashing and copying always exclude the same entries.

#### Scenario: Ignore set change propagates to both hash and copy
- **WHEN** `DEFAULT_IGNORE` is updated in the hashing module
- **THEN** both `hashSkill` and `copyTree` reflect the change without any additional code changes
