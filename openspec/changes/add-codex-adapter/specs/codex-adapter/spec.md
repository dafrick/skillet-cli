## ADDED Requirements

### Requirement: Codex adapter detects user scope when ~/.codex exists
The `codex` adapter SHALL include `'user'` in its `detect()` result when a `.codex/` directory exists in the user's home directory (`~/.codex/`). This directory is created by Codex CLI on first use and reliably indicates Codex is configured for the user.

#### Scenario: User scope detected when ~/.codex present
- **WHEN** `~/.codex/` directory exists on the user's system
- **THEN** `codexAdapter.detect(ctx)` returns a result with `scopes` containing `'user'`

#### Scenario: User scope absent when ~/.codex missing
- **WHEN** `~/.codex/` directory does not exist
- **THEN** `codexAdapter.detect(ctx)` returns a result with `scopes` not containing `'user'`

### Requirement: Codex adapter detects project scope when .codex/config.toml exists in cwd
The `codex` adapter SHALL include `'project'` in its `detect()` result when a `.codex/config.toml` file exists in the current working directory. Codex reads project-scoped configuration from `.codex/config.toml` — its presence reliably indicates Codex is configured for the project.

#### Scenario: Project scope detected when .codex/config.toml present in cwd
- **WHEN** a `.codex/config.toml` file exists in the current working directory
- **THEN** `codexAdapter.detect(ctx)` returns a result with `scopes` containing `'project'`

#### Scenario: Project scope absent when .codex/config.toml missing from cwd
- **WHEN** no `.codex/config.toml` file exists in the current working directory
- **THEN** `codexAdapter.detect(ctx)` returns a result with `scopes` not containing `'project'`

#### Scenario: .codex directory without config.toml does not trigger project scope
- **WHEN** a `.codex/` directory exists in cwd but contains no `config.toml`
- **THEN** `codexAdapter.detect(ctx)` does not include `'project'` scope

### Requirement: Codex adapter resolves user-scope install path under ~/.agents/skills
Codex CLI loads user-level skills from `$HOME/.agents/skills/`. The `codex` adapter SHALL return `path.join(ctx.home, '.agents', 'skills', skill.name)` when `ctx.scope === 'user'`.

#### Scenario: resolveInstallPath for user scope
- **WHEN** `codexAdapter.resolveInstallPath(skill, ctx)` is called with `scope: 'user'`
- **THEN** it returns `path.join(ctx.home, '.agents', 'skills', skill.name)`

### Requirement: Codex adapter resolves project-scope install path under .agents/skills in cwd
Codex CLI loads project-level skills from `.agents/skills/` relative to the current working directory. The `codex` adapter SHALL return `path.join(ctx.cwd, '.agents', 'skills', skill.name)` when `ctx.scope === 'project'`.

#### Scenario: resolveInstallPath for project scope
- **WHEN** `codexAdapter.resolveInstallPath(skill, ctx)` is called with `scope: 'project'`
- **THEN** it returns `path.join(ctx.cwd, '.agents', 'skills', skill.name)`

### Requirement: Codex adapter supports both user and project scope
`codexAdapter.supportsScope()` SHALL return `true` for both `'user'` and `'project'`.

#### Scenario: supportsScope returns true for user
- **WHEN** `codexAdapter.supportsScope('user')` is called
- **THEN** it returns `true`

#### Scenario: supportsScope returns true for project
- **WHEN** `codexAdapter.supportsScope('project')` is called
- **THEN** it returns `true`

### Requirement: Codex adapter render is a passthrough
`codexAdapter.render()` SHALL return `skill.sourceDir` unchanged.

#### Scenario: render returns sourceDir
- **WHEN** `codexAdapter.render(skill, ctx)` is called
- **THEN** it returns `skill.sourceDir` unchanged

### Requirement: Codex adapter has correct id and label
The `codex` adapter SHALL have `id: 'codex'` and `label: 'Codex CLI'`.

#### Scenario: adapter id is codex
- **WHEN** `codexAdapter.id` is read
- **THEN** it equals `'codex'`

#### Scenario: adapter label is Codex CLI
- **WHEN** `codexAdapter.label` is read
- **THEN** it equals `'Codex CLI'`
