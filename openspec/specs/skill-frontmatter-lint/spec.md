## ADDED Requirements

### Requirement: lintSkillFrontmatter detects missing leading delimiter
The library SHALL export a `lintSkillFrontmatter(content: string): boolean` function that returns `true` when the content is valid (frontmatter starts at position 0) and `false` when it is not.

#### Scenario: Content starting with --- is valid
- **WHEN** `lintSkillFrontmatter` is called with a string beginning with `---\n`
- **THEN** it returns `true`

#### Scenario: Content starting with CRLF --- is valid
- **WHEN** `lintSkillFrontmatter` is called with a string beginning with `---\r\n`
- **THEN** it returns `true`

#### Scenario: Content starting with blank line is invalid
- **WHEN** `lintSkillFrontmatter` is called with a string that begins with one or more blank lines before `---`
- **THEN** it returns `false`

#### Scenario: Content starting with H1 title is invalid
- **WHEN** `lintSkillFrontmatter` is called with a string that begins with `# Title\n` before `---`
- **THEN** it returns `false`

#### Scenario: Content with no frontmatter at all is invalid
- **WHEN** `lintSkillFrontmatter` is called with a string containing no `---` delimiter
- **THEN** it returns `false`

#### Scenario: Empty string is invalid
- **WHEN** `lintSkillFrontmatter` is called with an empty string
- **THEN** it returns `false`

### Requirement: lintSkillFrontmatter is exported from the core package public surface
`lintSkillFrontmatter` SHALL be re-exported from `packages/core/src/index.ts` so that `@skillet-cli/core` consumers (including `create-skillet`) can import it without depending on internal paths.

#### Scenario: Import from package root
- **WHEN** a consumer imports `{ lintSkillFrontmatter }` from `@skillet-cli/core`
- **THEN** the import resolves to the lint function without error
