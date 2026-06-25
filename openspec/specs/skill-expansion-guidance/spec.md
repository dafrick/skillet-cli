# skill-expansion-guidance Specification

## Purpose
TBD - created by archiving change expand-skill-update-workflow. Update Purpose after archive.
## Requirements
### Requirement: Wizard completion block includes skill expansion guidance
After printing the "Next steps" block, the wizard SHALL print a "To expand your skill" section that covers three scenarios: (1) adding a new directory to the published package, (2) re-running `create-skillet` for structural changes, (3) using `create-skillet check` to verify what will be published. This section is always printed on successful wizard completion, regardless of package state.

#### Scenario: Expansion guidance printed after next steps
- **WHEN** the `create-skillet` wizard completes successfully
- **THEN** the output includes a "To expand your skill" section after the "Next steps" block

#### Scenario: Guidance covers adding directories to files
- **WHEN** the "To expand your skill" section is printed
- **THEN** it includes a line explaining that `npm pkg set` can be used to add a new directory to the `files` field (e.g., `npm pkg set 'files[N]=new-dir/'`)

#### Scenario: Guidance covers re-running create-skillet
- **WHEN** the "To expand your skill" section is printed
- **THEN** it includes a statement that re-running `create-skillet` is safe for structural changes and that `package.json` fields are updated in-place while `skill/` setup is skipped if `skill/` already exists

#### Scenario: Guidance covers create-skillet check
- **WHEN** the "To expand your skill" section is printed
- **THEN** it references `create-skillet check` as the tool to verify what will be published

---

### Requirement: README documents the skill expansion workflow
`packages/create/README.md` SHALL contain an "Expanding your skill" section that explains the post-publish expansion workflow, including: how to add new directories to the published tarball using `npm pkg set 'files[N]=...'`, what re-running `create-skillet` touches vs. preserves, and how to use `create-skillet check` to verify tarball contents. This section SHALL be located after the subcommands section.

#### Scenario: README contains expansion section
- **WHEN** `packages/create/README.md` is read
- **THEN** it contains a section titled "Expanding your skill" (or equivalent) after the subcommands documentation

#### Scenario: README covers files field management
- **WHEN** the expansion section is read
- **THEN** it explains that the `files` field controls what is published and how to add new directories using `npm pkg set`

#### Scenario: README covers re-run safety
- **WHEN** the expansion section is read
- **THEN** it clarifies which fields `create-skillet` manages on re-run and which user-managed files are preserved

