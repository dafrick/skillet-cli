## ADDED Requirements

### Requirement: Completion block shows marketplace share commands when plugin manifests generated
When `create-skillet` completes scaffold and plugin manifests were generated, the completion block SHALL include a "Plugin marketplace ready" section with:
- The `claude plugin marketplace add` and `claude plugin install` commands derived from `repositoryUrl` and skill name
- A note that the same commands work with Copilot CLI by replacing `claude` with `copilot`
- If Gemini manifests were generated: a note to add the `gemini-cli-extension` GitHub topic and the install command

#### Scenario: share instructions include correct owner/repo
- **WHEN** `config.repositoryUrl` is `"https://github.com/owner/my-skill.git"`
- **THEN** the completion block shows `claude plugin marketplace add owner/my-skill`

#### Scenario: share instructions include install command
- **WHEN** `config.name` is `"my-skill"` and plugin manifests were generated
- **THEN** the completion block shows `claude plugin install my-skill@my-skill`

### Requirement: Share instructions omitted when no repositoryUrl
When no repository URL was provided during the wizard, the marketplace share instructions SHALL be omitted from the completion block. The plugin manifests are still generated, but the commands cannot be derived.

#### Scenario: no remote — no share block
- **WHEN** `config.repositoryUrl` is empty or absent
- **THEN** the completion block contains no marketplace share commands
