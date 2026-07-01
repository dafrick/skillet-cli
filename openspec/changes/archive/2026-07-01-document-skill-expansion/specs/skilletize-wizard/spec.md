## MODIFIED Requirements

### Requirement: Early gate informs user before making any changes
Before making any changes, the wizard SHALL display a summary of what was detected in the current directory and ask for confirmation. The summary SHALL include: (1) the absolute path of the current working directory, (2) the `SKILL.md` status using context-aware detection (root found, nested found with path, multiple found with count, or not found anywhere), (3) whether a `package.json` already exists, (4) the detected git user name (or "(not detected)" if unavailable), and (5) when `DetectionResult.isPrivate` is `true`, a `private:` line reading `true ⚠  (cannot publish until removed)`. Declining SHALL print manual setup instructions and exit with code 0. When the user accepts the gate and `DetectionResult.isExistingSkilletPackage` is `true`, the wizard SHALL proceed to the intent menu (see `skill-expansion-menu` spec) instead of directly into the configuration prompts; when `isExistingSkilletPackage` is `false`, the wizard proceeds directly to the configuration prompts as before.

#### Scenario: Detection context shown at gate — SKILL.md at root
- **WHEN** the early gate is displayed and `SKILL.md` exists at the project root
- **THEN** the output includes the absolute current working directory path, `SKILL.md: found`, package.json presence, and detected git user

#### Scenario: Detection context shown at gate — SKILL.md in subdirectory only
- **WHEN** the early gate is displayed and no root `SKILL.md` exists but one is found inside a subdirectory (e.g. `skill/my-skill/SKILL.md`)
- **THEN** the `SKILL.md:` line reads `found in skill/my-skill/` rather than `not found`

#### Scenario: Detection context shown at gate — multiple SKILL.md files
- **WHEN** the early gate is displayed and `SKILL.md` files are found in two or more subdirectories
- **THEN** the `SKILL.md:` line reads `found in N locations` where N is the number of discovered directories

#### Scenario: Detection context shown at gate — no SKILL.md anywhere
- **WHEN** the early gate is displayed and no `SKILL.md` exists anywhere in the project
- **THEN** the `SKILL.md:` line reads `not found`

#### Scenario: Detection context shown at gate — private: true
- **WHEN** the early gate is displayed and `DetectionResult.isPrivate` is `true`
- **THEN** the output includes a `private:` line with the warning text `(cannot publish until removed)`

#### Scenario: Detection context shown at gate — not private
- **WHEN** the early gate is displayed and `DetectionResult.isPrivate` is `false`
- **THEN** the output does NOT include a `private:` line

#### Scenario: User declines early gate
- **WHEN** the user runs `create-skillet` and answers "no" to the initial confirmation
- **THEN** the wizard prints manual setup instructions (npm init, npm pkg set, bin/cli.js steps) and exits with code 0 without making any changes

#### Scenario: User accepts early gate — first-time setup
- **WHEN** the user runs `create-skillet` and answers "yes" to the initial confirmation and `DetectionResult.isExistingSkilletPackage` is `false`
- **THEN** the wizard proceeds directly to the NPM configuration phase (full `collectConfig()` prompts)

#### Scenario: User accepts early gate — existing skillet package
- **WHEN** the user runs `create-skillet` and answers "yes" to the initial confirmation and `DetectionResult.isExistingSkilletPackage` is `true`
- **THEN** the wizard proceeds to the intent menu instead of directly into the NPM configuration phase

---

### Requirement: Wizard detects environment state before prompting
During detection (before any prompts), the wizard SHALL silently check: (1) whether a `package.json` exists in the current directory, (2) whether a `skill/` subfolder exists, (3) whether a `SKILL.md` exists in the root, (4) the git remote URL via `git remote get-url origin`, (5) the git user name and email via `git config`, (6) the `skillet.skillDir` field from an existing `package.json`, (7) the `skillet.skills` field (string or array form) from an existing `package.json`, (8) the `private` field from an existing `package.json`, and (9) the `files` array from an existing `package.json`. Detection failures SHALL be swallowed — missing data leaves the corresponding prompt field empty for manual entry. When `private` is strictly `true`, `DetectionResult.isPrivate` SHALL be `true`; in all other cases `isPrivate` SHALL be `false`. `DetectionResult.isExistingSkilletPackage` SHALL be `true` when `package.json` exists AND either `skillet.skillDir` or `skillet.skills` is present; otherwise `false`.

#### Scenario: Git remote is present
- **WHEN** `git remote get-url origin` succeeds
- **THEN** the detected URL is normalized to `git+https://` format and pre-filled as the default for the repository URL prompt

#### Scenario: Git remote is absent or git is not initialized
- **WHEN** `git remote get-url origin` exits non-zero
- **THEN** the repository URL prompt has no default and the user must enter it manually

#### Scenario: package.json already exists
- **WHEN** a `package.json` is present in the current directory
- **THEN** the wizard reads existing `name`, `version`, `author`, `description`, `skillet.skillDir`, `skillet.skills`, `private`, and `files` fields and uses the relevant ones as prompt defaults instead of derived values

#### Scenario: package.json has "private": true
- **WHEN** a `package.json` exists and contains `"private": true`
- **THEN** `DetectionResult.isPrivate` is `true`

#### Scenario: package.json has skillet.skillDir — existing package detected
- **WHEN** a `package.json` exists and contains a non-empty `skillet.skillDir` field
- **THEN** `DetectionResult.isExistingSkilletPackage` is `true`

#### Scenario: package.json has skillet.skills (array form) — existing package detected
- **WHEN** a `package.json` exists and contains a non-empty `skillet.skills` array
- **THEN** `DetectionResult.isExistingSkilletPackage` is `true`

#### Scenario: package.json has skillet.skills (string form) — existing package detected
- **WHEN** a `package.json` exists and contains a non-empty `skillet.skills` string (single parent directory)
- **THEN** `DetectionResult.isExistingSkilletPackage` is `true`

#### Scenario: package.json exists but has no skillet field — not an existing package
- **WHEN** a `package.json` exists but contains neither `skillet.skillDir` nor `skillet.skills`
- **THEN** `DetectionResult.isExistingSkilletPackage` is `false`

#### Scenario: No package.json — not an existing package
- **WHEN** no `package.json` exists in the current directory
- **THEN** `DetectionResult.isExistingSkilletPackage` is `false`

#### Scenario: Current files array captured
- **WHEN** a `package.json` exists and contains a `files` array
- **THEN** `DetectionResult.files` equals that array, made available for the expansion menu's plan computations
