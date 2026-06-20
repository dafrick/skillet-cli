## MODIFIED Requirements

### Requirement: Four built-in adapters registered by default
The library SHALL register `claude`, `copilot`, `agents`, and `codex` adapters automatically when the package is imported.

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

#### Scenario: codex adapter detected when ~/.codex exists
- **WHEN** `~/.codex/` directory exists on the user's system
- **THEN** the `codex` adapter's `detect()` returns a result including user scope

#### Scenario: codex adapter detects project scope when .codex/config.toml exists in cwd
- **WHEN** a `.codex/config.toml` file exists in the current working directory
- **THEN** the `codex` adapter's `detect()` includes project scope

### Requirement: agents adapter label updated to distinguish from Codex
The `agents` adapter SHALL have `label: 'Generic agents (.agents/)'` to distinguish it from the new `codex` adapter, which also installs to `.agents/skills/` but has Codex-specific detection.

#### Scenario: agents adapter label
- **WHEN** `agentsAdapter.label` is read
- **THEN** it equals `'Generic agents (.agents/)'`
