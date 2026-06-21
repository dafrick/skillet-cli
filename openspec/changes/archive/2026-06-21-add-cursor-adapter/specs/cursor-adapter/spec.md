## ADDED Requirements

### Requirement: Cursor adapter detects project scope when .cursor exists in cwd
The `cursor` adapter's `detect()` SHALL return project scope when a `.cursor/` directory exists in the current working directory.

#### Scenario: Project scope detected when .cursor exists in cwd
- **WHEN** a `.cursor/` directory exists in the current working directory
- **THEN** the `cursor` adapter's `detect()` returns a result including `'project'` scope

#### Scenario: Project scope not detected when .cursor is absent from cwd
- **WHEN** no `.cursor/` directory exists in the current working directory
- **THEN** the `cursor` adapter's `detect()` returns an empty scopes array

### Requirement: Cursor adapter does not detect user scope
Cursor IDE stores global rules in the application settings UI, not in a filesystem directory. There is no official `~/.cursor/` user-scope skills path. The `cursor` adapter's `detect()` SHALL never return `'user'` scope.

### Requirement: Cursor adapter supports project scope only
`cursor.supportsScope()` SHALL return `true` for `'project'` and `false` for `'user'`.

#### Scenario: supportsScope user returns false
- **WHEN** `cursor.supportsScope('user')` is called
- **THEN** it returns `false`

#### Scenario: supportsScope project returns true
- **WHEN** `cursor.supportsScope('project')` is called
- **THEN** it returns `true`

### Requirement: Cursor adapter resolves install path as a directory under .cursor/rules/
The `cursor` adapter's `resolveInstallPath()` SHALL return a directory path at `<cwd>/.cursor/rules/<skill.name>/`. The installer will write a single `.mdc` file inside this directory. Cursor reads `.mdc` files recursively from `.cursor/rules/`, so files in subdirectories are auto-loaded.

#### Scenario: resolveInstallPath for project scope
- **WHEN** `cursor.resolveInstallPath(skill, ctx)` is called with `scope: 'project'`
- **THEN** it returns `path.join(ctx.cwd, '.cursor', 'rules', skill.name)`

### Requirement: Cursor adapter implements renderFile to generate .mdc content
The `cursor` adapter SHALL implement the optional `renderFile(skill, ctx)` method on the `Adapter` interface. It SHALL return a Promise resolving to a string containing valid Cursor `.mdc` file content.

The generated `.mdc` content SHALL:
- Begin with a YAML frontmatter block (`---`) containing `description` (from `skill.description`) and `alwaysApply: false`
- Be followed by `skill.body` as the rule body

When the installer detects `renderFile` on the adapter, it SHALL call `renderFile()` to get the content and write it as `<skill.name>.mdc` inside the directory returned by `resolveInstallPath()`, rather than performing a directory tree copy.

#### Scenario: renderFile generates valid .mdc content
- **WHEN** `cursor.renderFile(skill, ctx)` is called with a skill whose SKILL.md has `description: "TDD workflow"` and body `"## Steps\n..."`
- **THEN** the resolved string is of the form:
  ```
  ---
  description: TDD workflow
  alwaysApply: false
  ---
  ## Steps
  ...
  ```

#### Scenario: renderFile uses skill.description from parsed SKILL.md
- **WHEN** `cursor.renderFile(skill, ctx)` is called
- **THEN** the `description` field in the generated `.mdc` frontmatter equals `skill.description`

#### Scenario: renderFile is absent on passthrough adapters
- **WHEN** `claudeAdapter.renderFile` is read
- **THEN** it is `undefined`

## MODIFIED Requirements

### Requirement: Adapter interface extended with optional renderFile method
The `Adapter` interface SHALL gain an optional `renderFile?(skill: NormalizedSkill, ctx: Context): Promise<string>` method.

When an adapter implements `renderFile`:
- The installer calls `renderFile()` instead of performing a directory tree copy
- The returned string is written as `<skill.name>.mdc` inside the directory returned by `resolveInstallPath()`
- `resolveInstallPath()` continues to return a directory path (consistent with all other adapters)

Adapters that do not implement `renderFile` use the existing directory-copy path unchanged.

### Requirement: Adapter interface widens render() parameter to NormalizedSkill
The `render()` method signature SHALL accept `NormalizedSkill` (which includes `description` and `body`) rather than `NormalizedSkillBase`.

`NormalizedSkill` is a superset of `NormalizedSkillBase`; existing passthrough adapters that only use `skill.sourceDir` are unaffected.
