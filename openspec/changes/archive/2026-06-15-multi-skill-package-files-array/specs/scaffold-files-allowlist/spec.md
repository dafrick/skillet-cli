## MODIFIED Requirements

### Requirement: Scaffold sets files allowlist in package.json
The `create-skillet` scaffold execution SHALL set the `files` field in the generated `package.json` based on the packaging mode:

- **Single-skill mode** (`isMultiSkill: false`): `files` SHALL be `["bin", "<skillDir>"]`, where `<skillDir>` is the skill content path collected during configuration prompts.
- **Multi-skill mode** (`isMultiSkill: true`): `files` SHALL be `["bin", "<parentDir1>/", "<parentDir2>/", ...]`, where each `<parentDirN>/` is an entry from `config.skillsParentDirs` normalized to have a trailing slash.

This restricts what `npm publish` includes to only the entry point directory and the skill content directory/directories.

#### Scenario: Single-skill — files field contains bin and skillDir
- **WHEN** `executeScaffold` completes successfully with `isMultiSkill: false`
- **THEN** `package.json` contains a `files` array with `"bin"` at index 0 and the configured skill content path at index 1

#### Scenario: Single-skill — files field set via indexed npm pkg set args
- **WHEN** the scaffold runs the npm command sequence with `isMultiSkill: false`
- **THEN** `npm pkg set "files[0]=bin" "files[1]=<skillDir>"` is executed as part of the command sequence, where `<skillDir>` is the configured skill content path

#### Scenario: Multi-skill single parent — files field contains bin and parent dir with trailing slash
- **WHEN** `executeScaffold` completes successfully with `isMultiSkill: true` and `skillsParentDirs: ["skills"]`
- **THEN** `package.json` contains a `files` array with `"bin"` at index 0 and `"skills/"` at index 1
- **AND** all skill subdirectories under `skills/` are included in the published tarball

#### Scenario: Multi-skill single parent — files set via indexed npm pkg set args
- **WHEN** the scaffold runs the npm command sequence with `isMultiSkill: true` and `skillsParentDirs: ["skills"]`
- **THEN** `npm pkg set "files[0]=bin" "files[1]=skills/"` is executed

#### Scenario: Multi-skill multiple parents — files field contains bin and all parent dirs
- **WHEN** `executeScaffold` completes successfully with `isMultiSkill: true` and `skillsParentDirs: ["core", "exp"]`
- **THEN** `package.json` contains a `files` array with `"bin"` at index 0, `"core/"` at index 1, and `"exp/"` at index 2

#### Scenario: Multi-skill multiple parents — files set via indexed npm pkg set args
- **WHEN** the scaffold runs the npm command sequence with `isMultiSkill: true` and `skillsParentDirs: ["core", "exp"]`
- **THEN** `npm pkg set "files[0]=bin" "files[1]=core/" "files[2]=exp/"` is executed

#### Scenario: skillsParentDirs entries without trailing slash are normalized
- **WHEN** `isMultiSkill: true` and a `skillsParentDirs` entry does not end with `/` (e.g. `"skills"`)
- **THEN** the generated `files[N]` arg appends a trailing slash (e.g. `"files[1]=skills/"`)

#### Scenario: Noise directories excluded from published package
- **WHEN** the skill directory contains `.git/`, `node_modules/`, or other untracked directories alongside `bin/` and the skill content directory/directories
- **THEN** `npm publish` includes only the contents of `bin/` and the skill content directory/directories

#### Scenario: Indexed form safe with runSync double-quote wrapping
- **WHEN** `executeScaffold` invokes `runSync` with `files[0]=bin` and `files[1]=<skillDir>` (or parent dir) as arguments
- **THEN** the resulting shell command is well-formed — these args contain no inner double quotes and are safe to wrap in the double-quote quoting that `runSync` applies to each argument
