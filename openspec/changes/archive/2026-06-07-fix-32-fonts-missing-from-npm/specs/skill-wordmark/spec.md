## ADDED Requirements

### Requirement: Wordmark font is loaded without filesystem access at runtime
The wordmark generator SHALL register the ANSI Shadow font data at module load time using figlet's importable font API (`figlet.parseFont`), so that `textSync` never requires a filesystem read when the code runs in a bundled context.

#### Scenario: Font is available synchronously in a bundled package
- **WHEN** `create-skillet` is invoked via `npx` from a published npm package where `fonts/` does not exist
- **THEN** `generateWordmark` renders the ANSI Shadow wordmark without throwing ENOENT
