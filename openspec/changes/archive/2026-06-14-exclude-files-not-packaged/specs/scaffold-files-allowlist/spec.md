## ADDED Requirements

### Requirement: Scaffold sets files allowlist in package.json
The `create-skillet` scaffold execution SHALL set the `files` field in the generated `package.json` to `["bin", "<skillDir>"]`, where `<skillDir>` is the skill content path collected during configuration prompts. This restricts what `npm publish` includes to only the entry point directory and the skill content directory.

#### Scenario: files field contains bin and skillDir
- **WHEN** `executeScaffold` completes successfully
- **THEN** `package.json` contains a `files` array with `"bin"` at index 0 and the configured skill content path at index 1

#### Scenario: files field set via indexed npm pkg set args
- **WHEN** the scaffold runs the npm command sequence
- **THEN** `npm pkg set "files[0]=bin" "files[1]=<skillDir>"` is executed as part of the command sequence, where `<skillDir>` is the configured skill content path

#### Scenario: Noise directories excluded from published package
- **WHEN** the skill directory contains `.git/`, `node_modules/`, or other untracked directories alongside `bin/` and the skill content directory
- **THEN** `npm publish` includes only the contents of `bin/` and the skill content directory

#### Scenario: Indexed form safe with runSync double-quote wrapping
- **WHEN** `executeScaffold` invokes `runSync` with `files[0]=bin` and `files[1]=<skillDir>` as arguments
- **THEN** the resulting shell command is well-formed — these args contain no inner double quotes and are safe to wrap in the double-quote quoting that `runSync` applies to each argument
