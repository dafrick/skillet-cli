## MODIFIED Requirements

### Requirement: Wizard detects environment state before prompting
During detection (before any prompts), the wizard SHALL silently check: (1) whether a `package.json` exists in the current directory, (2) whether a `skill/` subfolder exists, (3) whether a `SKILL.md` exists in the root, (4) the git remote URL via `git remote get-url origin`, (5) the git user name and email via `git config`, (6) the `skillet.skillDir` field from an existing `package.json`, and (7) the `private` field from an existing `package.json`. Detection failures SHALL be swallowed — missing data leaves the corresponding prompt field empty for manual entry. When `private` is strictly `true`, `DetectionResult.isPrivate` SHALL be `true`; in all other cases `isPrivate` SHALL be `false`.

#### Scenario: Git remote is present
- **WHEN** `git remote get-url origin` succeeds
- **THEN** the detected URL is normalized to `git+https://` format and pre-filled as the default for the repository URL prompt

#### Scenario: Git remote is absent or git is not initialized
- **WHEN** `git remote get-url origin` exits non-zero
- **THEN** the repository URL prompt has no default and the user must enter it manually

#### Scenario: package.json already exists
- **WHEN** a `package.json` is present in the current directory
- **THEN** the wizard reads existing `name`, `version`, `author`, `description`, `skillet.skillDir`, and `private` fields and uses them as prompt defaults instead of derived values

#### Scenario: package.json has "private": true
- **WHEN** a `package.json` exists and contains `"private": true`
- **THEN** `DetectionResult.isPrivate` is `true`

---

### Requirement: Early gate informs user before making any changes
Before making any changes, the wizard SHALL display a summary of what was detected in the current directory and ask for confirmation. The summary SHALL include: (1) the absolute path of the current working directory, (2) the `SKILL.md` status using context-aware detection (root found, nested found with path, multiple found with count, or not found anywhere), (3) whether a `package.json` already exists, (4) the detected git user name (or "(not detected)" if unavailable), and (5) when `DetectionResult.isPrivate` is `true`, a `private:` line reading `true ⚠  (cannot publish until removed)`. Declining SHALL print manual setup instructions and exit with code 0.

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

#### Scenario: User accepts early gate
- **WHEN** the user runs `create-skillet` and answers "yes" to the initial confirmation
- **THEN** the wizard proceeds to the NPM configuration phase

---

### Requirement: Configuration prompts collect package metadata
The wizard SHALL collect the following fields via interactive prompts in this order: package name, version, description, author, repository URL, license, (when `isPrivate` is true) private-field removal confirmation, skill content path. Each field SHALL have a sensible default derived from detection results. When `isPrivate` is `true`, after the license prompt, the wizard SHALL ask whether to remove `"private": true`; the default SHALL be yes (remove).

#### Scenario: Package name default from directory
- **WHEN** no `package.json` exists
- **THEN** the package name prompt defaults to the kebab-case form of the current directory name

#### Scenario: Version default
- **WHEN** no existing `version` field is detected
- **THEN** the version prompt defaults to `0.1.0`

#### Scenario: Author default from git config
- **WHEN** `git config user.name` and `git config user.email` both succeed
- **THEN** the author prompt defaults to `Name <email>` format

#### Scenario: Skill content path default — single-skill
- **WHEN** `skillet.skillDir` exists in an existing `package.json`, or a `skill/` subfolder exists, and `discoveredSkillDirs.length <= 1`
- **THEN** the skill content path prompt defaults to that value

#### Scenario: Skill content path prompt skipped — multi-skill
- **WHEN** `discoveredSkillDirs.length > 1`
- **THEN** the skill content path input prompt is NOT shown to the user

#### Scenario: Package name supplied as CLI argument
- **WHEN** the user runs `npm create skillet my-cooking-skill`
- **THEN** the package name prompt defaults to `my-cooking-skill`, taking precedence over the kebab-case directory name default

#### Scenario: Private removal prompt shown when isPrivate is true
- **WHEN** `detected.isPrivate` is `true` and the license prompt has been answered
- **THEN** the wizard asks whether to remove `"private": true`, defaulting to yes

#### Scenario: Private removal prompt absent when not private
- **WHEN** `detected.isPrivate` is `false`
- **THEN** no private-removal prompt appears

---

### Requirement: Wizard displays next steps on completion
After successful execution, the wizard SHALL print a completion message with recommended next steps. When `config.removePrivate` is `false` AND the package was originally private, the `npm publish` line SHALL be omitted and replaced with `Remove "private": true first: npm pkg delete private`. In all other cases, the next steps SHALL include both `npx . install` (test locally) and `npm publish` (publish to npm).

#### Scenario: Completion output — not private or private was removed
- **WHEN** all execution steps succeed and either `detected.isPrivate` was `false` OR `config.removePrivate` was `true`
- **THEN** the wizard prints a success message followed by `npx . install` and `npm publish` as labeled next steps

#### Scenario: Completion output — private declined to remove
- **WHEN** all execution steps succeed and `detected.isPrivate` was `true` and `config.removePrivate` was `false`
- **THEN** the wizard prints a success message followed by `npx . install` as a next step, and a note `Remove "private": true first: npm pkg delete private` instead of `npm publish`
