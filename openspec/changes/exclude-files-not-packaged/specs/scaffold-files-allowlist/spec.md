## ADDED Requirements

### Requirement: Scaffold sets files allowlist in package.json
The `create-skillet` scaffold execution SHALL set the `files` field in the generated `package.json` to `["bin", "<skillDir>"]`, where `<skillDir>` is the skill content path collected during configuration prompts. This restricts what `npm publish` includes to only the entry point directory and the skill content directory.

#### Scenario: files field contains bin and skillDir
- **WHEN** `executeScaffold` completes successfully
- **THEN** `package.json` contains a `files` array with `"bin"` and the configured skill content path as its two entries

#### Scenario: files field set via npm pkg set --json
- **WHEN** the scaffold runs the npm command sequence
- **THEN** `npm pkg set --json files='["bin","<skillDir>"]'` is executed as part of the command sequence, where `<skillDir>` is the configured skill content path

#### Scenario: Noise directories excluded from published package
- **WHEN** the skill directory contains `.git/`, `node_modules/`, or other untracked directories alongside `bin/` and the skill content directory
- **THEN** `npm publish` includes only the contents of `bin/` and the skill content directory

#### Scenario: Existing package.json files field atomically replaced
- **WHEN** a `package.json` already exists with a different or longer `files` array
- **THEN** `npm pkg set --json files='["bin","<skillDir>"]'` replaces the entire `files` field with exactly `["bin", "<skillDir>"]`, leaving no stale entries from the prior value
