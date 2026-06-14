## ADDED Requirements

### Requirement: Wizard detects multi-skill repos and informs the user
When `DetectionResult.discoveredSkillDirs` contains more than one entry, the wizard SHALL enter the multi-skill flow. It SHALL display the count and list of discovered skill paths and inform the user that all skills will be packaged into a single npm package. No select menu SHALL be shown.

#### Scenario: Multi-skill repo detected — informational display
- **WHEN** `discoveredSkillDirs.length > 1`
- **THEN** the wizard prints the number of discovered skills and each path (e.g. `skills/brainstorming/`, `skills/debugging/`)
- **AND** prints "All N skills will be packaged into this single npm package."

#### Scenario: Single-skill repo — existing flow is unchanged
- **WHEN** `discoveredSkillDirs.length <= 1`
- **THEN** the wizard uses the existing single-skill prompt path and no multi-skill messaging is shown

---

### Requirement: Wizard confirms before proceeding with multi-skill packaging
After displaying the multi-skill informational message, the wizard SHALL ask the user to confirm before continuing. Declining SHALL exit with code 0 without making any changes.

#### Scenario: User confirms multi-skill packaging
- **WHEN** the user answers "yes" to the multi-skill confirmation prompt
- **THEN** the wizard continues to the NPM configuration prompts

#### Scenario: User declines multi-skill packaging
- **WHEN** the user answers "no" to the multi-skill confirmation prompt
- **THEN** the wizard prints "No changes made." and exits with code 0

---

### Requirement: WizardConfig carries multi-skill fields
`WizardConfig` SHALL include `isMultiSkill: boolean` and `skillsParentDirs: string[]`. When the multi-skill flow runs, `isMultiSkill` SHALL be `true` and `skillsParentDirs` SHALL contain the deduplicated parent directories derived from `discoveredSkillDirs`. For the single-skill flow, `isMultiSkill` SHALL be `false` and `skillsParentDirs` SHALL be empty.

#### Scenario: Multi-skill WizardConfig is populated
- **WHEN** the wizard completes the multi-skill confirm step
- **THEN** the returned `WizardConfig` has `isMultiSkill: true` and `skillsParentDirs` containing the deduplicated parent paths of all discovered skill directories

#### Scenario: Single-skill WizardConfig is unchanged
- **WHEN** the wizard completes the single-skill prompt
- **THEN** the returned `WizardConfig` has `isMultiSkill: false` and `skillsParentDirs` as an empty array

---

### Requirement: Parent directories are derived automatically from discovered skill paths
The wizard SHALL compute `skillsParentDirs` by calling `path.dirname()` on each entry in `discoveredSkillDirs` and deduplicating the results using a `Set`. The `path.dirname()` call SHALL normalize trailing slashes before computing the parent.

#### Scenario: All skills share one parent directory
- **WHEN** `discoveredSkillDirs` is `["skills/brainstorming/", "skills/debugging/", "skills/planning/"]`
- **THEN** `skillsParentDirs` is `["skills"]`

#### Scenario: Skills span multiple parent directories
- **WHEN** `discoveredSkillDirs` is `["core/summarize/", "core/rewrite/", "exp/draft/"]`
- **THEN** `skillsParentDirs` is `["core", "exp"]`

---

### Requirement: scaffold.ts writes skillet.skills for multi-skill packages
When `WizardConfig.isMultiSkill` is `true`, `executeScaffold` SHALL write `skillet.skills` to `package.json` via `npm pkg set`. When `skillsParentDirs` has exactly one entry, the value SHALL be a plain string. When it has multiple entries, the value SHALL be a JSON array. `skillet.skillDir` SHALL NOT be written for multi-skill packages.

#### Scenario: Single parent directory — string value
- **WHEN** `isMultiSkill` is `true` and `skillsParentDirs` is `["skills"]`
- **THEN** `npm pkg set skillet.skills=skills` is run and `package.json` contains `"skillet": { "skills": "skills" }`

#### Scenario: Multiple parent directories — array value
- **WHEN** `isMultiSkill` is `true` and `skillsParentDirs` is `["core", "exp"]`
- **THEN** `npm pkg set` is run with `skillet.skills=["core","exp"]` and `package.json` contains `"skillet": { "skills": ["core", "exp"] }`

#### Scenario: skillet.skillDir is not written for multi-skill packages
- **WHEN** `isMultiSkill` is `true`
- **THEN** `npm pkg set skillet.skillDir=...` is NOT called and `package.json` does not contain a `skillet.skillDir` key

#### Scenario: Single-skill path is unchanged
- **WHEN** `isMultiSkill` is `false`
- **THEN** `npm pkg set skillet.skillDir=<skillDir>` is called exactly as before

---

### Requirement: NPM preview block shows multi-skill parent directories
When `isMultiSkill` is `true`, the preview block in `run.ts` SHALL display the list of parent directories under a `skillsParent:` label instead of `skillDir:`.

#### Scenario: Multi-skill preview shows parent directories
- **WHEN** the NPM preview step runs with `isMultiSkill: true` and `skillsParentDirs: ["skills"]`
- **THEN** the preview prints `  skillsParent:  skills` (not `  skillDir: ...`)

#### Scenario: Single-skill preview is unchanged
- **WHEN** the NPM preview step runs with `isMultiSkill: false`
- **THEN** the preview prints `  skillDir:     <path>` exactly as today
