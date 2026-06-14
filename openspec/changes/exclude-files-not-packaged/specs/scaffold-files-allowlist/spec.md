## ADDED Requirements

### Requirement: Scaffold sets files allowlist in package.json
The `create-skillet` scaffold execution SHALL set the `files` field in the generated `package.json` to `["bin", "<skillDir>"]`, where `<skillDir>` is the skill content path collected during configuration prompts. This restricts what `npm publish` includes to only the entry point directory and the skill content directory.

#### Scenario: files field contains bin and skillDir
- **WHEN** `executeScaffold` completes successfully
- **THEN** `package.json` contains a `files` array with `"bin"` and the configured skill content path as its two entries

#### Scenario: files field set via npm pkg set
- **WHEN** the scaffold runs the npm command sequence
- **THEN** `npm pkg set files[]=bin` and `npm pkg set files[]=${config.skillDir}` are executed (in that order) as part of the command sequence

#### Scenario: Noise directories excluded from published package
- **WHEN** the skill directory contains `.git/`, `node_modules/`, or other untracked directories alongside `bin/` and the skill content directory
- **THEN** `npm publish` includes only the contents of `bin/` and the skill content directory

#### Scenario: Existing package.json files field overwritten
- **WHEN** a `package.json` already exists with a different `files` field
- **THEN** `npm pkg set files[]=bin` resets `files` to the allowlist before adding the skill content path
