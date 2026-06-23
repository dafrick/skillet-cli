## ADDED Requirements

### Requirement: create-skillet post-publish subcommand exists
`create-skillet` SHALL expose a `post-publish` subcommand intended to be run via the `postpublish` npm lifecycle hook. It reads `package.json` and any plugin manifests present in the current directory and prints post-publish next steps.

### Requirement: post-publish prints plugin marketplace confirmation
When `.claude-plugin/plugin.json` exists, `post-publish` SHALL print a confirmation that the plugin marketplace is live at the published version, along with the install commands users can run.

#### Scenario: Claude and Copilot install commands shown
- **WHEN** `.claude-plugin/plugin.json` exists and `package.json` has `version: "1.1.0"` and `name: "my-skill"`
- **THEN** `post-publish` output includes `claude plugin install my-skill@my-skill` and `copilot plugin install my-skill@my-skill`

### Requirement: post-publish prints Gemini GitHub Release reminder
When `gemini-extension.json` exists, `post-publish` SHALL print a reminder to create a GitHub Release for the published version so Gemini CLI's gallery detects it as the latest. The reminder SHALL include the `gh release create` command and a note that the release is only needed for gallery "Latest" status — installs still work from the tag.

#### Scenario: Gemini reminder shown when gemini manifest present
- **WHEN** `gemini-extension.json` exists
- **THEN** `post-publish` output includes a reminder about creating a GitHub Release and the `gh release create v{version}` command

#### Scenario: Gemini reminder omitted when no gemini manifest
- **WHEN** `gemini-extension.json` does not exist
- **THEN** `post-publish` output contains no Gemini-related content

### Requirement: post-publish produces no output when no plugin manifests exist
When neither `.claude-plugin/plugin.json` nor `gemini-extension.json` exist, `post-publish` SHALL exit 0 silently, so the `postpublish` hook does not produce unexpected output for npm-only repos.

#### Scenario: npm-only repo — silent exit
- **WHEN** no plugin manifests exist
- **THEN** `post-publish` exits 0 with no output

### Requirement: scaffold wires postpublish script
`executeScaffold()` SHALL add `"postpublish": "create-skillet post-publish"` to the generated `package.json` scripts alongside the existing `prepublishOnly` entry, when plugin manifests are selected during the wizard.

#### Scenario: postpublish script present after scaffold with plugins
- **WHEN** the wizard is run with `generateClaudePlugin: true`
- **THEN** the generated `package.json` contains `"postpublish": "create-skillet post-publish"`

#### Scenario: postpublish script absent for npm-only scaffold
- **WHEN** the wizard is run with both `generateClaudePlugin: false` and `generateGeminiPlugin: false`
- **THEN** the generated `package.json` does not contain a `postpublish` script
