## MODIFIED Requirements

### Requirement: Full skill directory tree copied to install path
The library SHALL copy every file from the adapter's `render()` output path to the resolved install directory, preserving relative subdirectory structure, while excluding entries whose basenames appear in `DEFAULT_IGNORE` (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`).

#### Scenario: All files copied including subdirectories
- **WHEN** a skill directory contains nested subdirectories
- **THEN** the installed directory mirrors the full tree structure for non-ignored entries

#### Scenario: Existing install overwritten when no drift
- **WHEN** a previous install exists and no local modifications are detected
- **THEN** the install is overwritten silently

#### Scenario: Ignored entries not copied
- **WHEN** the skill source directory contains entries named `.git`, `node_modules`, `.DS_Store`, or `.skill-manifest.json`
- **THEN** those entries are absent from the installed directory after the copy step completes
