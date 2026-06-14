## MODIFIED Requirements

### Requirement: Configuration prompts collect package metadata
The wizard SHALL collect the following fields via interactive prompts in this order: package name, version, description, author, repository URL, license, skill content path. Each field SHALL have a sensible default derived from detection results. When `discoveredSkillDirs.length > 1`, the skill content path prompt SHALL be skipped; parent directories are derived automatically and no user input is needed for the skill path.

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

---

### Requirement: Execution uses only native npm commands
The wizard SHALL set up the npm package using only `npm init -y` and `npm pkg set` commands, plus direct file writes for `bin/cli.js`. It SHALL NOT write or overwrite `package.json` directly via `fs.writeFile` or `JSON.stringify`. For multi-skill packages, `npm pkg set skillet.skills=<value>` SHALL be used instead of `npm pkg set skillet.skillDir=<value>`.

#### Scenario: No existing package.json
- **WHEN** no `package.json` exists before execution
- **THEN** the wizard runs `npm init -y` to create one before running `npm pkg set` commands

#### Scenario: Existing package.json
- **WHEN** a `package.json` exists before execution
- **THEN** the wizard skips `npm init` and runs only `npm pkg set` commands

#### Scenario: All required fields are set — single-skill
- **WHEN** execution completes for a single-skill package
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license`, `type: "module"`, `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skillDir` (set to the skill content path), and a `bin` field with the package name pointing to `./bin/cli.js`

#### Scenario: All required fields are set — multi-skill
- **WHEN** execution completes for a multi-skill package
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license`, `type: "module"`, `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skills` (set to the parent directory or JSON array), and a `bin` field — and does NOT contain `skillet.skillDir`

#### Scenario: Repository URL left blank
- **WHEN** the user leaves the repository URL prompt empty
- **THEN** the wizard skips `npm pkg set repository.url` and `npm pkg set repository.type` — neither field is written to `package.json`
