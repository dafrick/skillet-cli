## ADDED Requirements

### Requirement: Root .gitignore uses contents pattern for test-manual/tmp/
The root `.gitignore` SHALL contain the entry `test-manual/tmp/*` (contents pattern, not `test-manual/tmp/` directory pattern) so that `tmp/.gitkeep` remains committable while all ephemeral test content is excluded.

#### Scenario: Ephemeral test content is not tracked
- **WHEN** files are created under `test-manual/tmp/` during a test run
- **THEN** `git status` shows no untracked files for that content

#### Scenario: .gitkeep is not excluded by the ignore pattern
- **WHEN** the `.gitignore` entry `test-manual/tmp/*` is in place
- **THEN** `git ls-files test-manual/tmp/.gitkeep` lists the file (it is not ignored)
