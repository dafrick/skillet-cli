## ADDED Requirements

### Requirement: Full skill directory tree copied to install path
The library SHALL copy every file from the adapter's `render()` output path to the resolved install directory, preserving relative subdirectory structure.

#### Scenario: All files copied including subdirectories
- **WHEN** a skill directory contains nested subdirectories
- **THEN** the installed directory mirrors the full tree structure

#### Scenario: Existing install overwritten when no drift
- **WHEN** a previous install exists and no local modifications are detected
- **THEN** the install is overwritten silently

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
