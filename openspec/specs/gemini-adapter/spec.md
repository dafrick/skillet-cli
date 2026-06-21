## Requirements

### Requirement: gemini adapter detects user scope via ~/.gemini directory
The `gemini` adapter's `detect()` SHALL return `user` in its scopes array when `~/.gemini/` exists on the user's system.

#### Scenario: User scope detected when ~/.gemini exists
- **WHEN** `~/.gemini/` directory exists on the current system
- **THEN** `geminiAdapter.detect(ctx)` returns a result whose `scopes` array includes `'user'`

#### Scenario: User scope absent when ~/.gemini does not exist
- **WHEN** `~/.gemini/` directory does not exist
- **THEN** `geminiAdapter.detect(ctx)` returns a result whose `scopes` array does not include `'user'`

### Requirement: gemini adapter detects project scope via .gemini directory in cwd
The `gemini` adapter's `detect()` SHALL return `project` in its scopes array when a `.gemini/` directory exists in the current working directory.

#### Scenario: Project scope detected when .gemini exists in cwd
- **WHEN** a `.gemini/` directory exists in the current working directory
- **THEN** `geminiAdapter.detect(ctx)` returns a result whose `scopes` array includes `'project'`

#### Scenario: Project scope absent when .gemini not in cwd
- **WHEN** no `.gemini/` directory exists in the current working directory
- **THEN** `geminiAdapter.detect(ctx)` returns a result whose `scopes` array does not include `'project'`

### Requirement: gemini adapter supports both user and project scope
`geminiAdapter.supportsScope()` SHALL return `true` for both `'user'` and `'project'`.

#### Scenario: supportsScope returns true for user
- **WHEN** `geminiAdapter.supportsScope('user')` is called
- **THEN** it returns `true`

#### Scenario: supportsScope returns true for project
- **WHEN** `geminiAdapter.supportsScope('project')` is called
- **THEN** it returns `true`

### Requirement: gemini adapter resolves install path under .gemini/skills
The `gemini` adapter's `resolveInstallPath()` SHALL return `~/.gemini/skills/<skill.name>/` for user scope and `<cwd>/.gemini/skills/<skill.name>/` for project scope.

#### Scenario: resolveInstallPath for user scope
- **WHEN** `geminiAdapter.resolveInstallPath(skill, ctx)` is called with `ctx.scope === 'user'`
- **THEN** it returns `path.join(ctx.home, '.gemini', 'skills', skill.name)`

#### Scenario: resolveInstallPath for project scope
- **WHEN** `geminiAdapter.resolveInstallPath(skill, ctx)` is called with `ctx.scope === 'project'`
- **THEN** it returns `path.join(ctx.cwd, '.gemini', 'skills', skill.name)`

### Requirement: gemini adapter is a passthrough renderer
The `gemini` adapter's `render()` SHALL return `skill.sourceDir` unchanged.

#### Scenario: render returns sourceDir
- **WHEN** `geminiAdapter.render(skill, ctx)` is called
- **THEN** it returns `skill.sourceDir` unchanged
