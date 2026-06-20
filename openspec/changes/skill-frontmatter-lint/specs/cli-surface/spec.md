## ADDED Requirements

### Requirement: create-skillet check reports frontmatter-position violations
The `create-skillet check` command SHALL read each skill's `SKILL.md`, call `lintSkillFrontmatter`, and report a violation when the lint returns `false`.

The violation message SHALL state: "SKILL.md frontmatter is not at the start of the file — this skill will not auto-load in Gemini CLI and is discouraged for Claude Code."

#### Scenario: Valid frontmatter passes silently
- **WHEN** `create-skillet check` is run and all skill `SKILL.md` files start with `---`
- **THEN** no frontmatter-lint warning is emitted

#### Scenario: Invalid frontmatter emits violation message
- **WHEN** `create-skillet check` is run and a `SKILL.md` does not start with `---`
- **THEN** the violation message is printed identifying the affected skill and the frontmatter-position problem

#### Scenario: Frontmatter violation is non-blocking in preview (non-interactive) mode
- **WHEN** `create-skillet check` is run with `interactive: false` and a frontmatter violation is found
- **THEN** the warning is printed but the command exits with code 0 (violation is advisory, not fatal)

### Requirement: create-skillet check offers interactive fix for frontmatter violations
When running interactively and a frontmatter-position violation is detected, the command SHALL prompt the user with a yes/no choice: "Fix SKILL.md by moving frontmatter to the start of the file?" If the user accepts, the command SHALL rewrite `SKILL.md` with the frontmatter block (`---\n<fields>\n---\n`) as the first content, followed by the original body.

#### Scenario: User accepts fix — file is rewritten
- **WHEN** a frontmatter violation is found in interactive mode and the user confirms the fix
- **THEN** `SKILL.md` is rewritten so that `---` is the first line, all existing frontmatter fields are preserved, and the original body follows

#### Scenario: User declines fix — file is unchanged
- **WHEN** a frontmatter violation is found in interactive mode and the user declines the fix
- **THEN** `SKILL.md` is not modified and the warning remains in the output

#### Scenario: Fix preserves all existing frontmatter fields
- **WHEN** the fix is applied to a `SKILL.md` with `name`, `description`, `version`, and custom fields
- **THEN** the rewritten file contains all those fields in the frontmatter block

#### Scenario: Re-running check after fix reports no violation
- **WHEN** the fix is accepted and `create-skillet check` is run again
- **THEN** no frontmatter-lint warning is emitted for that skill
