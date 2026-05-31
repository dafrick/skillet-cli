## ADDED Requirements

### Requirement: update operates only on already-installed targets by default
The `update` command SHALL scan known target locations, identify where the skill is currently installed, and operate only on those targets — it SHALL NOT add the skill to new targets unless `--add-new` is specified.

#### Scenario: update skips uninstalled targets
- **WHEN** `update` is run and a target has no existing install of the skill
- **THEN** that target is not touched

#### Scenario: --add-new offers newly available targets
- **WHEN** `update --add-new` is run and a target now has an adapter that wasn't present at install time
- **THEN** that target is offered as a new installation option

### Requirement: Skip already-up-to-date installs silently
If the install folder is pristine (no drift) AND the new `renderHash` equals the stored `renderHash`, the library SHALL skip that target without output or prompting.

#### Scenario: No-op on unchanged install
- **WHEN** the source content has not changed and the render logic has not changed
- **THEN** `update` skips the install and reports it as already up to date

### Requirement: Silently overwrite pristine but stale installs
If the install folder is pristine (no drift) but the new `renderHash` differs from the stored one, the library SHALL overwrite silently without prompting.

#### Scenario: Silent refresh when source changed and no local edits
- **WHEN** the author has published updated skill content and the user has not edited the install
- **THEN** `update` overwrites the install directory and updates the manifest without any prompt

### Requirement: Three-way prompt for drifted installs
If the install folder is locally modified (drift detected), the library SHALL prompt the user with three options: backup and overwrite, overwrite (discard changes), or skip.

#### Scenario: User chooses backup and overwrite
- **WHEN** drift is detected and the user selects "backup and overwrite"
- **THEN** the existing install folder is renamed to a timestamped backup sibling directory and the new version is installed in its place

#### Scenario: User chooses overwrite
- **WHEN** drift is detected and the user selects "overwrite"
- **THEN** the existing install is replaced with no backup

#### Scenario: User chooses skip
- **WHEN** drift is detected and the user selects "skip"
- **THEN** the install is left unchanged

### Requirement: Unknown-state installs prompt with an unrecognized-state warning
If `update` encounters an install directory that has no `.skill-manifest.json` (a pre-skillet or manually placed install), the library SHALL prompt using the same three-way dialog (backup and overwrite / overwrite / skip) but SHALL additionally display a warning that the prior state of the install is unrecognized and cannot be diffed.

#### Scenario: Missing manifest triggers warning on update
- **WHEN** `update` finds a directory at a known install path that contains no `.skill-manifest.json`
- **THEN** the library prints a warning stating the prior state is unrecognized and presents the backup/overwrite/skip prompt

#### Scenario: --force with missing manifest overwrites without prompt
- **WHEN** `update --force` runs and an install has no `.skill-manifest.json`
- **THEN** the install is overwritten without a prompt (matching --force behavior for drifted installs)

### Requirement: --force bypasses drift prompt and overwrites
When `--force` is passed, the library SHALL overwrite drifted installs without prompting.

#### Scenario: --force overwrites modified install
- **WHEN** drift is detected and `--force` is set
- **THEN** the install is overwritten without any prompt

### Requirement: Non-interactive mode skips drifted installs
When stdin is not a TTY and `--force` is not set, the library SHALL skip drifted installs and print a warning, rather than hanging on a prompt.

#### Scenario: CI skips modified installs safely
- **WHEN** drift is detected and the process is non-interactive (no TTY) and `--force` is not set
- **THEN** the install is skipped and a warning message is printed

### Requirement: update notifier checks for newer npm package versions
The library SHALL use `update-notifier` to passively check whether a newer version of the author's npm package is available and print a one-line nudge if so, at most once per 24 hours.

#### Scenario: Nudge printed when newer version available
- **WHEN** a newer version of the skill package exists on npm and 24 hours have passed since the last check
- **THEN** a one-line update notice is printed to stderr after the command completes

#### Scenario: No nudge when up to date
- **WHEN** the installed npm package is the latest version
- **THEN** no update notice is printed
