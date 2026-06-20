## MODIFIED Requirements

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
