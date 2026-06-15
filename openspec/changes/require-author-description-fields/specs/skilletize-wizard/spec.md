## MODIFIED Requirements

### Requirement: Configuration prompts collect package metadata
The wizard SHALL collect the following fields via interactive prompts in this order: package name, version, description, author, repository URL, license, skill content path. Each field SHALL have a sensible default derived from detection results. The `Description` prompt message SHALL read `Description (optional):` and the `Author` prompt message SHALL read `Author (optional):` to signal that blank input is accepted.

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

#### Scenario: Description prompt message includes optional label
- **WHEN** the wizard displays the Description prompt
- **THEN** the prompt message reads `Description (optional):`

#### Scenario: Author prompt message includes optional label
- **WHEN** the wizard displays the Author prompt
- **THEN** the prompt message reads `Author (optional):`
