## MODIFIED Requirements

### Requirement: Installer calls renderFile when the adapter implements it
When the selected adapter implements an optional `renderFile(skill, ctx): Promise<string>` method, the installer SHALL use it instead of the existing directory tree copy. The installer SHALL create the directory returned by `resolveInstallPath()`, call `renderFile()` to obtain the file content, and write the result as `<skill.name>.mdc` inside that directory.

Adapters that do not implement `renderFile` are unaffected — the installer continues to use the existing directory copy path for them.

#### Scenario: renderFile path — file written inside install directory
- **WHEN** `skillet install` runs with an adapter that has a `renderFile` method
- **THEN** the installer creates the directory from `resolveInstallPath()`, calls `adapter.renderFile(skill, ctx)`, and writes the returned string as `<skill.name>.mdc` inside that directory

#### Scenario: no renderFile — directory copy used
- **WHEN** `skillet install` runs with an adapter that has no `renderFile` method
- **THEN** the installer performs the existing directory tree copy into the path from `resolveInstallPath()`, unchanged from current behavior
