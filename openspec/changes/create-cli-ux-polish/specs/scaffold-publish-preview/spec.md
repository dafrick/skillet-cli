## MODIFIED Requirements

### Requirement: Publish preview lists files that will be published (shown after setupSkillDir)
After `setupSkillDir` completes in the `create-skillet` wizard, a publish preview SHALL display the tarball contents grouped by classification tier (skill content, infrastructure, ambiguous). Entries within each tier SHALL be displayed with directories collapsed to a single `dirname/ (N files)` row by default. When violations are present and the wizard is running in interactive mode, the CLI SHALL enter the interactive `.npmignore` triage flow (see `interactive-npmignore` spec) rather than printing a static "add to .npmignore" instruction. In non-interactive mode, violations continue to be reported as a static message.

#### Scenario: Preview shows skill directory file tree with collapsed directories
- **WHEN** the wizard has completed `setupSkillDir` and the tarball contains entries inside directories
- **THEN** the classification tiers are shown with directory entries collapsed to `dirname/ (N files)` rows by default, rather than a flat list of every file path

#### Scenario: Violations trigger interactive triage in interactive mode
- **WHEN** the publish preview is shown in interactive (TTY) mode and violation-tier entries are present
- **THEN** the CLI enters the interactive triage flow from the `interactive-npmignore` spec instead of printing "add them to .npmignore and rerun"

#### Scenario: Violations reported statically in non-interactive mode
- **WHEN** the publish preview is shown in non-interactive mode (post-wizard read-only pass or non-TTY) and violations are present
- **THEN** violations are reported as a static message (unchanged behavior); no interactive prompt is shown

#### Scenario: Skill directory does not exist after setupSkillDir (error path)
- **WHEN** `setupSkillDir` completes but the skill content directory is still absent (unexpected error path)
- **THEN** the preview skips the file tree and instead notes that the directory was not found, without throwing
