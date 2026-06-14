## ADDED Requirements

### Requirement: Publish preview lists files that will be published (shown after setupSkillDir)
After `setupSkillDir` completes in the `create-skillet` wizard, a publish preview SHALL display the contents of the skill content directory that will be included in the published npm package, and SHALL note which entries (if any) are excluded because they match the standard ignore set (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`). The preview is shown before the final confirmation prompt.

#### Scenario: Preview shows skill directory file tree
- **WHEN** the wizard has completed `setupSkillDir` and the skill content directory exists on disk
- **THEN** the output lists the files and subdirectories inside the skill content directory that will be published

#### Scenario: Excluded entries noted in preview
- **WHEN** the skill content directory contains entries matching the standard ignore set (e.g., `node_modules/`)
- **THEN** the preview output notes those entries as excluded, so the user knows they will not be published

#### Scenario: Preview shown before confirmation prompt
- **WHEN** the publish preview is displayed
- **THEN** the file inclusion list appears before the confirmation prompt, giving the user full context before they commit

#### Scenario: Skill directory does not exist after setupSkillDir (error path)
- **WHEN** `setupSkillDir` completes but the skill content directory is still absent (unexpected error path)
- **THEN** the preview skips the file tree and instead notes that the directory was not found, without throwing
