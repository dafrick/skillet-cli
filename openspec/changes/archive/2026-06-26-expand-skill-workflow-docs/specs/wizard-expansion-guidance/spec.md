## ADDED Requirements

### Requirement: Wizard prints expansion guidance block after completion next steps
After the standard "Next steps" block, the wizard completion output SHALL include a "To expand your skill" section covering three post-publish expansion scenarios. This block SHALL be printed unconditionally on every successful wizard run.

#### Scenario: Expansion guidance printed on first run
- **WHEN** the wizard completes successfully and no `package.json` existed before the run
- **THEN** the output includes a "To expand your skill" section after the "Next steps" block

#### Scenario: Expansion guidance printed on re-run
- **WHEN** the wizard completes successfully and a `package.json` already existed before the run
- **THEN** the output includes a "To expand your skill" section after the "Next steps" block

#### Scenario: New directory scenario includes concrete npm pkg set guidance
- **WHEN** the "To expand your skill" section is printed
- **THEN** the output includes guidance for adding a new directory to the published package using `npm pkg set files[N]=newdir/` with a note that `N` depends on the current `files` array

#### Scenario: Simple update scenario explains no re-run needed
- **WHEN** the "To expand your skill" section is printed
- **THEN** the output explains that adding new files within the existing skill directory requires only a version bump and `npm publish`, not a wizard re-run

#### Scenario: Structural change scenario includes re-run warning
- **WHEN** the "To expand your skill" section is printed
- **THEN** the output explains that structural changes (new skillDir, multi-skill) require re-running `create-skillet`
- **AND** the output warns that the wizard will re-ask `name`, `version`, `description`, and `author` with no pre-population
- **AND** the output warns that `bin/cli.js` is always overwritten on re-run

#### Scenario: Expansion guidance references create-skillet check
- **WHEN** the "To expand your skill" section is printed
- **THEN** the output includes a reference to `create-skillet check` as the way to verify tarball contents after expansion
