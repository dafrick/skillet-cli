## ADDED Requirements

### Requirement: Detect local modifications by comparing folder hash to postInstallHash
The library SHALL compute the current hash of the installed skill folder (excluding `.skill-manifest.json`) and compare it to the `postInstallHash` stored in the manifest. If they differ, the install is considered locally modified (drifted).

#### Scenario: Pristine install returns clean status
- **WHEN** no files in the installed directory have been changed since install
- **THEN** drift detection reports the install as pristine

#### Scenario: Modified file triggers drift
- **WHEN** a user edits any file in the installed skill directory after install
- **THEN** drift detection reports the install as locally modified

#### Scenario: .skill-manifest.json excluded from drift check
- **WHEN** `.skill-manifest.json` is the only changed file (e.g. a tool updated it externally)
- **THEN** drift detection does not report the install as locally modified

### Requirement: Missing manifest treated as unknown state
If `.skill-manifest.json` does not exist in an installed directory, the library SHALL treat the install as having an unknown prior state, not as pristine.

#### Scenario: Directory without manifest is flagged as unknown
- **WHEN** a skill directory exists at the install path but contains no `.skill-manifest.json`
- **THEN** drift detection returns an `unknown` state

### Requirement: Drift status exposed to list command
The `list` command SHALL display each install's drift status (`pristine`, `modified`, or `unknown`) alongside its location and content hash.

#### Scenario: list shows modified flag
- **WHEN** a user runs `list` and an install has been locally modified
- **THEN** the output marks that install as modified

#### Scenario: list shows stale flag
- **WHEN** the current source `contentHash` differs from the manifest's `contentHash`
- **THEN** the output marks that install as stale (out of date relative to source)
