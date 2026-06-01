## MODIFIED Requirements

### Requirement: Test fixtures live inside the package
A multi-file skill directory (`fixtures/skilletize/`) SHALL live at `packages/core/fixtures/skilletize/` containing a `SKILL.md` with valid `name` and `description` frontmatter, a non-empty markdown body, and a `resources/` subfolder with template files. This fixture is used by all three test layers. The old `fixtures/hello-skill/` directory SHALL be deleted.

#### Scenario: Fixture is a valid skill
- **WHEN** `normalizeSkill('packages/core/fixtures/skilletize')` is called
- **THEN** it returns a `NormalizedSkill` with `name: 'skilletize'`, `description`, and a non-empty `contentHash`

#### Scenario: Old hello-skill fixture is removed
- **WHEN** `packages/core/fixtures/` is listed
- **THEN** `hello-skill/` does not exist and `skilletize/` does exist
