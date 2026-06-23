## ADDED Requirements

### Requirement: Wizard prompts for plugin marketplace distribution
`create-skillet` SHALL present a plugin distribution prompt group after collecting npm metadata. The prompt SHALL offer two independent options:
- Claude Code + Copilot CLI (generates `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`)
- Gemini CLI (generates `gemini-extension.json` and `GEMINI.md`)

Both options SHALL default to `true` when a GitHub remote is detected in the wizard config. Both SHALL default to `false` when no remote is available, with an explanatory note that a public GitHub repository is required.

#### Scenario: defaults on when GitHub remote present
- **GIVEN** the wizard has collected a `repositoryUrl` containing a GitHub remote
- **WHEN** the plugin distribution prompt renders
- **THEN** both Claude Code + Copilot CLI and Gemini CLI checkboxes are checked by default

#### Scenario: defaults off when no remote
- **GIVEN** no `repositoryUrl` was provided
- **WHEN** the plugin distribution prompt renders
- **THEN** both checkboxes are unchecked by default and a note explains that a public GitHub repo is required

### Requirement: plugin.json generated for Claude Code + Copilot CLI
When the user selects Claude Code + Copilot CLI distribution, the scaffold SHALL create `.claude-plugin/plugin.json` with:
- `name`: from wizard `config.name`
- `description`: from wizard `config.description`
- `version`: from wizard `config.version`
- `author`: from wizard `config.author` (as `{ name: string }` object)
- `license`: from wizard `config.license`
- `skills`: array of paths derived from `config.skillDir` (single-skill) or `config.skillsParentDirs` (multi-skill), all prefixed with `./`

#### Scenario: single-skill plugin.json
- **WHEN** `config.isMultiSkill` is `false` and `config.skillDir` is `"skills/my-skill"`
- **THEN** `.claude-plugin/plugin.json` contains `"skills": ["./skills/my-skill"]`

#### Scenario: multi-skill plugin.json
- **WHEN** `config.isMultiSkill` is `true` and `config.skillsParentDirs` is `["skills/a", "skills/b"]`
- **THEN** `.claude-plugin/plugin.json` contains `"skills": ["./skills/a", "./skills/b"]`

### Requirement: marketplace.json generated alongside plugin.json
When the user selects Claude Code + Copilot CLI distribution, the scaffold SHALL create `.claude-plugin/marketplace.json` with:
- `name`: from wizard `config.name`
- `owner.name`: from wizard `config.author`
- `plugins[0].name`: from wizard `config.name`
- `plugins[0].version`: from wizard `config.version`
- `plugins[0].source`: `"./"`

#### Scenario: marketplace.json self-references the repo
- **WHEN** `.claude-plugin/marketplace.json` is generated
- **THEN** `plugins[0].source` equals `"./"`

#### Scenario: marketplace name matches plugin name
- **WHEN** `.claude-plugin/marketplace.json` is generated
- **THEN** the top-level `name` field equals `plugins[0].name`

### Requirement: gemini-extension.json generated for Gemini CLI
When the user selects Gemini CLI distribution, the scaffold SHALL create `gemini-extension.json` at the repo root with:
- `name`: from wizard `config.name`
- `version`: from wizard `config.version`
- `description`: from wizard `config.description`
- `contextFileName`: the direct skill path for single-skill packages; `"GEMINI.md"` for multi-skill packages

#### Scenario: single-skill contextFileName points directly to SKILL.md
- **WHEN** `config.isMultiSkill` is `false` and `config.skillDir` is `"skills/my-skill"`
- **THEN** `gemini-extension.json` contains `"contextFileName": "skills/my-skill/SKILL.md"` and no `GEMINI.md` is created

#### Scenario: multi-skill contextFileName points to GEMINI.md
- **WHEN** `config.isMultiSkill` is `true`
- **THEN** `gemini-extension.json` contains `"contextFileName": "GEMINI.md"`

### Requirement: GEMINI.md generated only for multi-skill packages
When the user selects Gemini CLI distribution and `config.isMultiSkill` is `true`, the scaffold SHALL create `GEMINI.md` at the repo root containing one `@./` import line per skill directory pointing to `SKILL.md`. For single-skill packages, no `GEMINI.md` is created.

#### Scenario: multi-skill GEMINI.md contains all skill imports
- **WHEN** `config.skillsParentDirs` is `["skills/a", "skills/b"]`
- **THEN** `GEMINI.md` contains `@./skills/a/SKILL.md` and `@./skills/b/SKILL.md` on separate lines

#### Scenario: single-skill produces no GEMINI.md
- **WHEN** `config.isMultiSkill` is `false`
- **THEN** no `GEMINI.md` file is created

### Requirement: .claude-plugin/ directory created automatically
The scaffold SHALL create the `.claude-plugin/` directory (and any missing parent directories) before writing plugin manifests.

### Requirement: existing manifests not overwritten without prompt
If `.claude-plugin/plugin.json` or `gemini-extension.json` already exist, the scaffold SHALL warn the author and skip writing those files. It SHALL NOT silently overwrite.

#### Scenario: existing plugin.json skipped
- **WHEN** `.claude-plugin/plugin.json` already exists
- **THEN** the scaffold emits a warning and leaves the file unchanged
