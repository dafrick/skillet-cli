## ADDED Requirements

### Requirement: Parse SKILL.md frontmatter and body
The library SHALL read a `SKILL.md` file from the given `skillDir`, parse its YAML frontmatter, and extract the markdown body into a `NormalizedSkill` object.

#### Scenario: Valid SKILL.md with required fields
- **WHEN** `normalizeSkill(skillDir)` is called and `skillDir/SKILL.md` contains valid YAML frontmatter with `name` and `description` fields
- **THEN** the returned `NormalizedSkill` has `name`, `description`, `body`, `frontmatter`, and `sourceDir` populated

#### Scenario: Missing name field
- **WHEN** `normalizeSkill(skillDir)` is called and frontmatter lacks a `name` field
- **THEN** the function throws an error identifying the missing required field

#### Scenario: Missing description field
- **WHEN** `normalizeSkill(skillDir)` is called and frontmatter lacks a `description` field
- **THEN** the function throws an error identifying the missing required field

#### Scenario: Optional declaredVersion captured
- **WHEN** frontmatter includes a `version` field
- **THEN** `NormalizedSkill.declaredVersion` is set to that value

#### Scenario: Missing SKILL.md
- **WHEN** `normalizeSkill(skillDir)` is called and no `SKILL.md` exists in `skillDir`
- **THEN** the function throws an error indicating the file was not found

### Requirement: Expose full frontmatter passthrough
The library SHALL make the complete parsed frontmatter object available on `NormalizedSkill.frontmatter` so adapters can access any author-defined fields.

#### Scenario: Custom frontmatter fields preserved
- **WHEN** `SKILL.md` frontmatter contains fields beyond `name`, `description`, and `version`
- **THEN** all extra fields are available verbatim on `NormalizedSkill.frontmatter`

### Requirement: sourceDir is an absolute path
The `NormalizedSkill.sourceDir` field SHALL be the absolute resolved path to the skill directory on disk.

#### Scenario: Relative input path resolved
- **WHEN** `normalizeSkill` is called with a relative `skillDir` path
- **THEN** `NormalizedSkill.sourceDir` is the absolute version of that path

### Requirement: NormalizedSkill includes contentHash
`normalizeSkill` SHALL compute the content hash of the skill directory (using the algorithm defined in the content-hashing capability) and attach the result as `NormalizedSkill.contentHash`. The returned object is therefore the single authoritative source for both skill metadata and its hash identity.

#### Scenario: contentHash present on returned object
- **WHEN** `normalizeSkill(skillDir)` is called on a valid skill directory
- **THEN** the returned `NormalizedSkill` has a `contentHash` field starting with `sha256:`

#### Scenario: contentHash reflects tree contents
- **WHEN** a file in the skill directory is edited and `normalizeSkill` is called again
- **THEN** the returned `contentHash` differs from the previous call
