## ADDED Requirements

### Requirement: Root .gitignore excludes test-manual/tmp/
The root `.gitignore` SHALL contain an entry that excludes all content under `test-manual/tmp/` from git tracking.

#### Scenario: Ephemeral test content is not tracked
- **WHEN** files are created under `test-manual/tmp/` during a test run
- **THEN** `git status` shows no untracked files for that content
