## ADDED Requirements

### Requirement: packages/core/package.json URLs reference the skillet-cli repository
`packages/core/package.json` SHALL use `https://github.com/dafrick/skillet-cli` as the base URL for the `repository.url`, `homepage`, and `bugs.url` fields. No field SHALL reference the legacy `dafrick/skillet` repo name.

#### Scenario: repository URL points to skillet-cli
- **WHEN** `packages/core/package.json` is read
- **THEN** `repository.url` is `git+https://github.com/dafrick/skillet-cli.git`

#### Scenario: homepage points to skillet-cli
- **WHEN** `packages/core/package.json` is read
- **THEN** `homepage` is `https://github.com/dafrick/skillet-cli`

#### Scenario: bugs URL points to skillet-cli issues
- **WHEN** `packages/core/package.json` is read
- **THEN** `bugs.url` is `https://github.com/dafrick/skillet-cli/issues`
