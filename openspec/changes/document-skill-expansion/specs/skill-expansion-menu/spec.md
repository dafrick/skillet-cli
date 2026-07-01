## ADDED Requirements

### Requirement: Intent menu shown on re-run against an existing skillet package
When `create-skillet` is run and the early gate is accepted with `DetectionResult.isExistingSkilletPackage` equal to `true`, the wizard SHALL present a `select()` menu of intents instead of proceeding directly into the full configuration wizard:
- Add a directory to the published package
- Add another skill / convert to multi-skill
- Reconfigure everything (name, version, description, author, license, layout)
- Just check what would be published

#### Scenario: Menu shown on re-run
- **WHEN** the early gate is accepted and `DetectionResult.isExistingSkilletPackage` is `true`
- **THEN** the wizard displays the four-option intent menu before any further prompts

#### Scenario: Menu not shown on first-time setup
- **WHEN** the early gate is accepted and `DetectionResult.isExistingSkilletPackage` is `false`
- **THEN** the wizard proceeds directly to the full configuration wizard; the intent menu is not shown

#### Scenario: "Just check" delegates to the existing check command
- **WHEN** the user selects "Just check what would be published"
- **THEN** the wizard invokes the same `runCheck` logic used by `create-skillet check` and exits without writing anything

---

### Requirement: Add-directory flow never touches published metadata
When the user selects "Add a directory to the published package", the wizard SHALL prompt only for the directory path to add, compute the resulting `files[]` array by appending to `DetectionResult.files` (never overwriting or reordering existing entries), display a concrete plan naming the directory to be added, and — on confirmation — write only the updated `files[]` field via `npm pkg set`. It SHALL NOT collect or write `name`, `version`, `description`, `author`, or `license`.

#### Scenario: Directory appended to files array
- **WHEN** the user selects "Add a directory" and enters `prompts/`, and the current `files` array is `["bin", "skill"]`
- **THEN** the computed plan is to set `files` to `["bin", "skill", "prompts/"]`

#### Scenario: Plan names the directory, not an index
- **WHEN** the add-directory plan is displayed
- **THEN** the output reads in terms of the directory path being added (e.g., "Will add `prompts/` to the published package") and does not mention a `files[N]` index

#### Scenario: Confirmation required before write
- **WHEN** the add-directory plan is displayed
- **THEN** the wizard asks for a single confirmation before running `npm pkg set` for the updated `files` array

#### Scenario: Decline leaves package.json untouched
- **WHEN** the user declines the add-directory plan confirmation
- **THEN** no `npm pkg set` command runs and `package.json` is unchanged

#### Scenario: No metadata fields collected
- **WHEN** the add-directory flow runs to completion
- **THEN** `name`, `version`, `description`, `author`, and `license` are not prompted for and are not written

---

### Requirement: Add-skill / convert-to-multi-skill flow never touches published metadata
When the user selects "Add another skill / convert to multi-skill", the wizard SHALL determine whether the package is currently single-skill or already multi-skill (via `DetectionResult`), prompt only for the new skill's directory, compute the resulting `skillet.skills` value (converting from `skillet.skillDir` to a `skillet.skills` array when starting from single-skill, or appending to the existing `skillet.skills` array/parent dirs when already multi-skill) and the corresponding `files[]` entries, display a concrete plan, and — on confirmation — write only the `skillet.skills` and `files[]` fields via `npm pkg set`. It SHALL NOT collect or write `name`, `version`, `description`, `author`, or `license`.

#### Scenario: Single-skill package converts to multi-skill
- **WHEN** the user selects "Add another skill" on a package with `skillet.skillDir: "skill"` and adds a new skill under `skills/debugging`
- **THEN** the computed plan converts the package to multi-skill, setting `skillet.skills` to include both the original skill's parent directory and `skills/`, and updates `files[]` accordingly

#### Scenario: Already multi-skill package gains another entry
- **WHEN** the user selects "Add another skill" on a package already using `skillet.skills`
- **THEN** the computed plan appends the new skill's parent directory to the existing `skillet.skills` value without disturbing existing entries

#### Scenario: Plan names the directories, not an index
- **WHEN** the add-skill plan is displayed
- **THEN** the output names the directories involved (e.g., "Will convert to multi-skill: `skills/brainstorming/`, `skills/debugging/`") and does not mention a `files[N]` index

#### Scenario: Confirmation required before write
- **WHEN** the add-skill plan is displayed
- **THEN** the wizard asks for a single confirmation before running the corresponding `npm pkg set` commands

#### Scenario: Decline leaves package.json untouched
- **WHEN** the user declines the add-skill plan confirmation
- **THEN** no `npm pkg set` command runs and `package.json` is unchanged

#### Scenario: No metadata fields collected
- **WHEN** the add-skill flow runs to completion
- **THEN** `name`, `version`, `description`, `author`, and `license` are not prompted for and are not written

---

### Requirement: Reconfigure-everything selects the existing full wizard path
When the user selects "Reconfigure everything", the wizard SHALL proceed into the existing `collectConfig()` / `executeScaffold()` flow unchanged, except that it is additionally subject to the metadata diff+consent behavior (see `metadata-change-consent` spec).

#### Scenario: Reconfigure runs the full wizard
- **WHEN** the user selects "Reconfigure everything"
- **THEN** the wizard proceeds through the same configuration prompts (name, version, description, author, repository URL, license, skill content path) as a first-time run
