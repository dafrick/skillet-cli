## ADDED Requirements

### Requirement: Full skill directory tree copied to install path
The library SHALL copy every file from the adapter's `render()` output path to the resolved install directory, preserving relative subdirectory structure, while excluding entries whose basenames appear in `DEFAULT_IGNORE` (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`).

#### Scenario: All files copied including subdirectories
- **WHEN** a skill directory contains nested subdirectories
- **THEN** the installed directory mirrors the full tree structure for non-ignored entries

#### Scenario: Existing install overwritten when no drift
- **WHEN** a previous install exists and no local modifications are detected
- **THEN** the install is overwritten silently

#### Scenario: Ignored entries not copied
- **WHEN** the skill source directory contains entries named `.git`, `node_modules`, `.DS_Store`, or `.skill-manifest.json`
- **THEN** those entries are absent from the installed directory after the copy step completes

### Requirement: .skill-manifest.json written after every successful install
The library SHALL write a `.skill-manifest.json` file into the installed skill directory immediately after copying the tree. The manifest SHALL include: `name`, `description`, `source`, `declaredVersion`, `contentHash`, `renderHash`, `adapterId`, `scope`, `libVersion`, `installedAt`, and `postInstallHash`.

#### Scenario: Manifest fields populated on fresh install
- **WHEN** `install` completes for a target
- **THEN** the installed directory contains a `.skill-manifest.json` with all required fields populated

#### Scenario: postInstallHash reflects actual installed tree
- **WHEN** the manifest is written
- **THEN** `postInstallHash` equals the hash of the installed folder excluding `.skill-manifest.json` itself

#### Scenario: installedAt is ISO 8601
- **WHEN** the manifest is written
- **THEN** `installedAt` is a valid ISO 8601 datetime string

### Requirement: renderHash computed from contentHash, adapterId, and libVersion
The library SHALL compute `renderHash` as `sha256(<contentHash>|<adapterId>|<libVersion>)` and store it in the manifest.

#### Scenario: renderHash changes when libVersion changes
- **WHEN** the same skill is installed with two different versions of `@skillet-cli/core`
- **THEN** the resulting `renderHash` values differ

### Requirement: source field records npm package provenance
When `pkg` is provided to `run()`, the library SHALL set `manifest.source` to `"npm:<pkg.name>@<pkg.version>"`.

#### Scenario: source field format
- **WHEN** `pkg.name` is `"my-skill"` and `pkg.version` is `"1.2.0"`
- **THEN** `manifest.source` is `"npm:my-skill@1.2.0"`

### Requirement: Install path created if it does not exist
The library SHALL create the target install directory (and any missing parent directories) before copying files.

#### Scenario: New install directory created automatically
- **WHEN** the resolved install path does not yet exist
- **THEN** the directory and all missing parents are created before files are written

### Requirement: beforeInstall and afterInstall hooks called
If hooks are provided, the library SHALL call `beforeInstall(skill, adapter, ctx)` before copying and `afterInstall(skill, adapter, ctx)` after writing the manifest.

#### Scenario: beforeInstall called before copy
- **WHEN** a `beforeInstall` hook is registered
- **THEN** it is invoked before any files are written to the install path

#### Scenario: afterInstall called after manifest written
- **WHEN** an `afterInstall` hook is registered
- **THEN** it is invoked after `.skill-manifest.json` is written

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

### Requirement: Installer renders installNote when the adapter provides one
After the user selects a scope, the installer SHALL check whether `adapter.installNote` is a function. If it is, the installer SHALL call `adapter.installNote(scope)`. If the return value is a non-empty string, the installer SHALL display it as a contextual note before proceeding with installation.

When `installNote` is absent or returns `undefined`, installation proceeds with no additional output.

#### Scenario: installNote present and returns string — note is displayed
- **WHEN** the selected adapter implements `installNote` and `installNote(scope)` returns a non-empty string
- **THEN** the installer displays that string as a note during the install confirmation step

#### Scenario: installNote absent — no note displayed
- **WHEN** the selected adapter does not implement `installNote`
- **THEN** installation proceeds without any additional note output

#### Scenario: installNote returns undefined — no note displayed
- **WHEN** the selected adapter implements `installNote` but returns `undefined` for the selected scope
- **THEN** installation proceeds without any additional note output

#### Scenario: Codex user scope shows shared-path note
- **WHEN** the `codex` adapter is selected with `scope: 'user'`
- **THEN** the installer displays the note returned by `codexAdapter.installNote('user')` before writing files

### Requirement: Installer calls renderFile when the adapter implements it
When the selected adapter implements an optional `renderFile(skill, ctx): Promise<string>` method, the installer SHALL use it instead of the existing directory tree copy. The installer SHALL create the directory returned by `resolveInstallPath()`, call `renderFile()` to obtain the file content, and write the result as `<skill.name>.mdc` inside that directory.

Adapters that do not implement `renderFile` are unaffected — the installer continues to use the existing directory copy path for them.

#### Scenario: renderFile path — file written inside install directory
- **WHEN** `skillet install` runs with an adapter that has a `renderFile` method
- **THEN** the installer creates the directory from `resolveInstallPath()`, calls `adapter.renderFile(skill, ctx)`, and writes the returned string as `<skill.name>.mdc` inside that directory

#### Scenario: no renderFile — directory copy used
- **WHEN** `skillet install` runs with an adapter that has no `renderFile` method
- **THEN** the installer performs the existing directory tree copy into the path from `resolveInstallPath()`, unchanged from current behavior
