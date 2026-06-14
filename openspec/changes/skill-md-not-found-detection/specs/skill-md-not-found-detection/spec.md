## ADDED Requirements

### Requirement: skillMdStatus helper maps DetectionResult to a display string
The `skillMdStatus` pure function SHALL accept a `DetectionResult` and return a human-readable string describing where (if anywhere) a `SKILL.md` was found: `"found"` when `hasSkillMd` is true; `"found in <path>"` when exactly one entry exists in `discoveredSkillDirs` and `hasSkillMd` is false; `"found in N locations"` when more than one entry exists in `discoveredSkillDirs` and `hasSkillMd` is false; `"not found"` when both `hasSkillMd` is false and `discoveredSkillDirs` is empty.

#### Scenario: Root SKILL.md present
- **WHEN** `hasSkillMd` is `true`
- **THEN** `skillMdStatus` returns `"found"`

#### Scenario: Single nested SKILL.md
- **WHEN** `hasSkillMd` is `false` and `discoveredSkillDirs` contains exactly one entry (e.g. `"skill/openspec-auto/"`)
- **THEN** `skillMdStatus` returns `"found in skill/openspec-auto/"`

#### Scenario: Multiple nested SKILL.md files
- **WHEN** `hasSkillMd` is `false` and `discoveredSkillDirs` contains more than one entry
- **THEN** `skillMdStatus` returns `"found in N locations"` where N is the count of entries

#### Scenario: No SKILL.md anywhere
- **WHEN** `hasSkillMd` is `false` and `discoveredSkillDirs` is empty
- **THEN** `skillMdStatus` returns `"not found"`

#### Scenario: Root SKILL.md takes precedence over discoveredSkillDirs
- **WHEN** `hasSkillMd` is `true` AND `discoveredSkillDirs` is non-empty
- **THEN** `skillMdStatus` returns `"found"` (root check wins, no path suffix emitted)
