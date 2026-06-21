## ADDED Requirements

### Requirement: skillet install warns on frontmatter-position violation
During installation, after reading the skill's `SKILL.md`, the library SHALL call `lintSkillFrontmatter` on the raw file content. If the lint returns `false`, the library SHALL emit a warning to stderr and continue installation without interruption.

The warning message SHALL state: "⚠ <skill-name>: SKILL.md frontmatter is not at the start of the file — this skill will not auto-load in Gemini CLI and is discouraged for Claude Code."

#### Scenario: Valid frontmatter — no warning emitted
- **WHEN** a skill's `SKILL.md` starts with `---`
- **THEN** no frontmatter warning is written to stderr during install

#### Scenario: Invalid frontmatter — warning emitted, install continues
- **WHEN** a skill's `SKILL.md` does not start with `---`
- **THEN** the warning is written to stderr and the install completes normally (exit code unaffected)

#### Scenario: Warning names the specific skill
- **WHEN** the frontmatter warning is emitted for a skill named `my-workflow`
- **THEN** the warning output includes `my-workflow` so the user knows which skill triggered it
