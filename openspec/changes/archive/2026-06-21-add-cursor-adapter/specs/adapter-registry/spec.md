## MODIFIED Requirements

### Requirement: Four built-in v0.1 adapters registered by default
The library SHALL register `claude`, `copilot`, `agents`, and `cursor` adapters automatically when the package is imported.

#### Scenario: claude adapter detected when ~/.claude exists
- **WHEN** `~/.claude/` directory exists on the user's system
- **THEN** the `claude` adapter's `detect()` returns a result including user scope

#### Scenario: claude adapter detects project scope when .claude/ exists in cwd
- **WHEN** a `.claude/` directory exists in the current working directory
- **THEN** the `claude` adapter's `detect()` includes project scope

#### Scenario: copilot adapter detected (project) when .github/ exists in cwd
- **WHEN** a `.github/` directory exists in the current working directory
- **THEN** the `copilot` adapter's `detect()` returns a result indicating project scope is available

#### Scenario: copilot adapter detected (user) when ~/.copilot/ exists
- **WHEN** a `.copilot/` directory exists in the user's home directory
- **THEN** the `copilot` adapter's `detect()` returns a result indicating user scope is available

#### Scenario: agents adapter always available
- **WHEN** `detect()` is called on the `agents` adapter regardless of environment
- **THEN** it returns both user and project scope as available

#### Scenario: cursor adapter detected when .cursor/ exists in cwd
- **WHEN** a `.cursor/` directory exists in the current working directory
- **THEN** the `cursor` adapter's `detect()` returns a result including project scope
