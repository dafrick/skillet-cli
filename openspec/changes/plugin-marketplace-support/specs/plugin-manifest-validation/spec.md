## ADDED Requirements

### Requirement: create-skillet check validates plugin.json version
If `.claude-plugin/plugin.json` exists, `create-skillet check` SHALL compare its `version` field against `package.json` version. If they differ, the check SHALL exit 1 with a message naming both the file and the mismatched version values.

#### Scenario: versions match — no error
- **WHEN** `plugin.json` version equals `package.json` version
- **THEN** no version error is emitted and the check continues

#### Scenario: versions differ — exits 1
- **WHEN** `plugin.json` version is `"1.0.0"` and `package.json` version is `"1.1.0"`
- **THEN** check exits 1 with a message identifying `.claude-plugin/plugin.json` as out of sync

### Requirement: create-skillet check validates gemini-extension.json version
If `gemini-extension.json` exists, `create-skillet check` SHALL compare its `version` field against `package.json` version. A mismatch SHALL cause exit 1.

#### Scenario: gemini version mismatch — exits 1
- **WHEN** `gemini-extension.json` version differs from `package.json` version
- **THEN** check exits 1 naming `gemini-extension.json` as out of sync

### Requirement: create-skillet check validates plugin.json skills paths
If `.claude-plugin/plugin.json` exists and has a `skills` array, `create-skillet check` SHALL verify that each path in the array resolves to a directory containing a `SKILL.md` file. Missing paths or missing `SKILL.md` files SHALL cause exit 1.

#### Scenario: valid skills path — no error
- **WHEN** every path in `plugin.json` `skills` resolves to a directory with `SKILL.md`
- **THEN** no path error is emitted

#### Scenario: missing skills directory — exits 1
- **WHEN** a path in `plugin.json` `skills` does not exist on disk
- **THEN** check exits 1 naming the missing path

### Requirement: create-skillet check validates gemini-extension.json contextFileName
If `gemini-extension.json` exists and declares a `contextFileName`, `create-skillet check` SHALL verify that a file at that path exists relative to the repo root. A missing file SHALL cause exit 1. The path may be a direct skill path (e.g. `"skills/my-skill/SKILL.md"`) or `"GEMINI.md"`.

#### Scenario: direct SKILL.md contextFileName exists — no error
- **WHEN** `contextFileName` is `"skills/my-skill/SKILL.md"` and that file exists
- **THEN** no contextFileName error is emitted

#### Scenario: GEMINI.md contextFileName exists — no error
- **WHEN** `contextFileName` is `"GEMINI.md"` and `GEMINI.md` exists at repo root
- **THEN** no contextFileName error is emitted

#### Scenario: contextFileName missing — exits 1
- **WHEN** the file referenced by `contextFileName` does not exist
- **THEN** check exits 1 naming the missing context file

### Requirement: create-skillet check validates git working tree is clean
When plugin manifests exist, `create-skillet check` SHALL verify the git working tree has no uncommitted changes (`git status --porcelain` produces no output). A dirty working tree SHALL cause exit 1 with a message identifying uncommitted files and instructing the author to commit before publishing.

#### Scenario: clean tree — no error
- **WHEN** `git status --porcelain` returns empty output
- **THEN** no working-tree error is emitted

#### Scenario: dirty tree — exits 1
- **WHEN** `git status --porcelain` returns one or more lines
- **THEN** check exits 1 naming the uncommitted files and instructing the author to commit them

### Requirement: create-skillet check validates git tag exists on remote
When plugin manifests exist, `create-skillet check` SHALL verify that the tag `v{package.json version}` exists on the `origin` remote (`git ls-remote origin refs/tags/v{version}`). A missing tag SHALL cause exit 1 with a message showing the exact commands needed to create and push the tag.

#### Scenario: tag exists on remote — no error
- **WHEN** `git ls-remote origin refs/tags/v1.1.0` returns a non-empty result
- **THEN** no tag error is emitted

#### Scenario: tag missing from remote — exits 1
- **WHEN** `git ls-remote origin refs/tags/v1.1.0` returns empty
- **THEN** check exits 1 with the message showing: `git tag v1.1.0 && git push origin v1.1.0`

### Requirement: create-skillet check validates git remote exists
When plugin manifests exist, `create-skillet check` SHALL verify that a git remote named `origin` is configured. A missing remote SHALL cause exit 1 with an explanatory message.

#### Scenario: origin remote missing — exits 1
- **WHEN** no git remote named `origin` is configured
- **THEN** check exits 1 explaining that a GitHub remote is required for plugin marketplace distribution

### Requirement: git ls-remote failure treated as a check error
If `git ls-remote origin` fails (network unreachable, auth failure), `create-skillet check` SHALL exit 1 with a message explaining the remote was unreachable and instructing the author to verify the tag manually before running `npm publish`.

### Requirement: validation skipped when manifests absent
Plugin manifest validation and git readiness checks SHALL be skipped silently when no plugin manifests exist. A repo without plugin manifests SHALL pass `create-skillet check` without any plugin-related output.

#### Scenario: no plugin manifests — no plugin output
- **WHEN** neither `.claude-plugin/plugin.json` nor `gemini-extension.json` exist
- **THEN** `create-skillet check` produces no output related to plugin validation or git readiness
