## MODIFIED Requirements

### Requirement: README documents the RunOptions API
The README SHALL include a `RunOptions` reference table listing all options (`pkg`, `verbMode`, `displayName`, `wordmarkName`, `hooks.transform`, `hooks.beforeInstall`, `hooks.afterInstall`, `hooks.extendProgram`) with their types and descriptions. `skillDir` SHALL NOT appear in the table; skill location is configured via `skillet.skillDir` or `skillet.skills` in `package.json`.

#### Scenario: All RunOptions are documented
- **WHEN** a developer searches the README for `hooks.afterInstall`
- **THEN** they find an entry describing the option's type and purpose

#### Scenario: skillDir is not listed in RunOptions
- **WHEN** a developer searches the README for `skillDir` in the RunOptions table
- **THEN** they do not find it; instead the README directs them to `package.json` configuration
