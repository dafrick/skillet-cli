## MODIFIED Requirements

### Requirement: install command detects targets and prompts by default
When run interactively with no `--target` flag, `install` SHALL detect available targets, present a multi-select prompt, and install to all selected targets. For multi-skill packages, the scope and target prompts SHALL be presented exactly once for the entire batch — not once per skill.

#### Scenario: Multi-select prompt lists detected targets
- **WHEN** `install` is run interactively without `--target`
- **THEN** a checkbox prompt listing all detected targets (plus the generic `agents` fallback) is shown

#### Scenario: Non-interactive install installs to all detected targets
- **WHEN** `install` is run in a non-TTY environment without `--target`
- **THEN** all detected targets are installed to without prompting

#### Scenario: --target flag skips detection prompt
- **WHEN** `install --target claude --target agents` is passed
- **THEN** only those two targets are installed, with no prompt shown

#### Scenario: --yes flag suppresses selection prompt
- **WHEN** `install --yes` is run interactively
- **THEN** all detected targets are selected without showing the multi-select prompt

#### Scenario: Multi-skill package prompts exactly once
- **WHEN** `install` is run interactively on a package containing N skills (N > 1) without `--target` or `--scope` flags
- **THEN** the scope prompt appears exactly once and the target multi-select appears exactly once before any skill is installed
