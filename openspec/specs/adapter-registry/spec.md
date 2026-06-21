## ADDED Requirements

### Requirement: Central adapter registry object with methods
The library SHALL export a `registry` object with three methods: `registry.register(adapter)`, `registry.get(id)`, and `registry.list()`. Adapters registered before `run()` is called are available to all commands. The top-level `registerAdapter(adapter)` export is a convenience alias for `registry.register(adapter)`.

#### Scenario: Registered adapter is retrievable by ID
- **WHEN** `registry.register(adapter)` is called with an adapter object
- **THEN** `registry.get(adapter.id)` returns that adapter

#### Scenario: list() returns all registered adapters
- **WHEN** `registry.list()` is called after several adapters have been registered
- **THEN** it returns all registered adapters

#### Scenario: Duplicate ID rejected
- **WHEN** `registry.register(adapter)` is called with an `id` that is already registered
- **THEN** the library throws an error

#### Scenario: registerAdapter is an alias for registry.register
- **WHEN** `registerAdapter(adapter)` is called
- **THEN** the adapter is retrievable via `registry.get(adapter.id)`, identical to having called `registry.register(adapter)`

### Requirement: Adapter interface contract
Every adapter SHALL implement the following interface:
- `id: string` — unique short identifier (e.g. `"claude"`)
- `label: string` — human-readable name for prompts
- `detect(ctx: Context): DetectResult` — returns which scopes are available on the current system
- `supportsScope(scope: 'user' | 'project'): boolean` — declares supported scopes
- `resolveInstallPath(skill: NormalizedSkill, ctx: Context): string` — returns the absolute install directory
- `render(skill: NormalizedSkill, ctx: Context): string` — returns the path of the tree to copy (passthrough adapters return `skill.sourceDir`)

#### Scenario: Passthrough adapter render returns sourceDir
- **WHEN** a Bucket A adapter's `render()` is called
- **THEN** it returns `skill.sourceDir` unchanged

#### Scenario: detect returns empty when environment absent
- **WHEN** `detect(ctx)` is called on a machine where the target agent is not installed
- **THEN** it returns an empty or `none` result indicating no detectable scope

### Requirement: Four built-in v0.1 adapters registered by default
The library SHALL register `claude`, `copilot`, `agents`, `gemini`, and `codex` adapters automatically when the package is imported.

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

#### Scenario: gemini adapter detected when ~/.gemini exists
- **WHEN** `~/.gemini/` directory exists on the user's system
- **THEN** the `gemini` adapter's `detect()` returns a result including user scope

#### Scenario: gemini adapter detected (project) when .gemini/ exists in cwd
- **WHEN** a `.gemini/` directory exists in the current working directory
- **THEN** the `gemini` adapter's `detect()` returns a result including project scope

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

### Requirement: Adapters support user and/or project scope
The library SHALL allow each adapter to declare which scopes it supports. An error SHALL be raised if a caller requests an unsupported scope for a given adapter.

#### Scenario: copilot supports user scope
- **WHEN** `copilot.supportsScope('user')` is called
- **THEN** it returns `true`

#### Scenario: claude supports both scopes
- **WHEN** `claude.supportsScope('user')` and `claude.supportsScope('project')` are called
- **THEN** both return `true`

#### Scenario: copilot resolveInstallPath for project scope
- **WHEN** `copilot.resolveInstallPath(skill, ctx)` is called with `scope: 'project'`
- **THEN** it returns `.github/skills/<skill.name>/` relative to the current working directory

#### Scenario: copilot resolveInstallPath for user scope
- **WHEN** `copilot.resolveInstallPath(skill, ctx)` is called with `scope: 'user'`
- **THEN** it returns `~/.copilot/skills/<skill.name>/`

### Requirement: Third-party adapters registerable via registerAdapter or registry.register
The library SHALL allow consumers to register custom adapters beyond the built-in three using either `registerAdapter(adapter)` or `registry.register(adapter)`.

#### Scenario: Custom adapter participates in detection
- **WHEN** a custom adapter is registered and its `detect()` returns a positive result
- **THEN** it appears as a selectable target in the install prompt
