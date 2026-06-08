## MODIFIED Requirements

### Requirement: Release workflows only trigger on release tag pushes
`.github/workflows/release-core.yml` SHALL trigger on `push` to tags matching `core-v*`. `.github/workflows/release-create.yml` SHALL trigger on `push` to tags matching `create-v*`. Neither release workflow SHALL use `workflow_run` as a trigger. This ensures release workflow runs only appear in the Actions log when a release tag is actually pushed, eliminating skipped runs on every push to `main` or PR update.

Each release job SHALL reference `github.sha` for the checkout ref and `github.ref_name` for the tag name (semver validation). No `if:` condition gating on CI conclusion is required — the workflow only starts when the tag is pushed.

#### Scenario: Release workflow runs only on release tag push
- **WHEN** a tag matching `core-v*` is pushed to the repository
- **THEN** `release-core.yml` starts exactly once and publishes `@skillet-cli/core` to npm

#### Scenario: Release workflow does not run on push to main
- **WHEN** a commit is pushed to `main` (no tag)
- **THEN** neither `release-core.yml` nor `release-create.yml` creates a workflow run

#### Scenario: Release workflow does not run on PR update
- **WHEN** a pull request is opened or updated
- **THEN** neither `release-core.yml` nor `release-create.yml` creates a workflow run

#### Scenario: Create release workflow runs only on create tag push
- **WHEN** a tag matching `create-v*` is pushed to the repository
- **THEN** `release-create.yml` starts exactly once and publishes `create-skillet` to npm

#### Scenario: Semver validation uses tag name
- **WHEN** the release job runs
- **THEN** the semver validation step reads `github.ref_name` (e.g. `core-v1.2.3`) and verifies it matches the expected pattern
