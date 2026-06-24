## ADDED Requirements

### Requirement: Tarball violations trigger interactive triage, not a static message
When `create-skillet check` (or the post-wizard publish preview in non-interactive mode) finds one or more tarball entries classified as violations, the CLI SHALL NOT simply print "add them to .npmignore". Instead, it SHALL enter an interactive triage flow that lets the user select which entries to exclude and then writes `.npmignore` directly.

#### Scenario: Violations found — triage prompt shown
- **WHEN** `create-skillet check` is run interactively and the tarball contains violation-tier entries
- **THEN** the CLI prints the violation list and enters the interactive triage flow rather than printing a static instruction

#### Scenario: No violations — triage skipped
- **WHEN** the tarball contains no violation-tier entries
- **THEN** the interactive triage flow is not presented and the existing output (file classification summary) is shown as before

#### Scenario: Non-interactive mode — static message preserved
- **WHEN** `check` is invoked in non-interactive mode (e.g., the post-wizard preview pass or a non-TTY environment)
- **THEN** violations are reported as a static message (unchanged behavior); the interactive triage flow is NOT presented

---

### Requirement: Triage presents violations as a collapsible directory tree
The triage prompt SHALL display violation entries grouped by directory. Entries whose path begins with the same first path segment SHALL be collapsed into a single `dirname/ (N files)` row. Top-level file entries (no directory prefix) appear as individual rows. All entries are pre-selected (included in the package) by default; the user unchecks entries to exclude them.

#### Scenario: Directory entries collapsed by default
- **WHEN** the triage prompt is shown and three violation entries share the prefix `node_modules/`
- **THEN** a single row `node_modules/ (3 files)` appears in the checkbox list, pre-checked

#### Scenario: Top-level file entries shown individually
- **WHEN** a violation entry has no directory component (e.g., `.env`)
- **THEN** it appears as its own row in the checkbox list

#### Scenario: Mixed directories and files
- **WHEN** the violation set contains both `node_modules/lodash/index.js` and `.env`
- **THEN** the list shows `node_modules/ (1 file)` and `.env` as separate rows

---

### Requirement: User can expand a collapsed directory one level
After the initial triage selection, when any of the user's *selected* (included) rows are collapsed directories, the CLI SHALL offer a follow-up prompt: "Any directories you'd like to inspect further?" listing only the selected collapsed directories. The user may check one or more to expand. Each selected directory is replaced by its direct children (files or sub-directories, which are themselves collapsed if they contain multiple files). This expand cycle repeats until the user answers "no" or no collapsible directories remain.

#### Scenario: Expand prompt offered when collapsible dirs remain selected
- **WHEN** after the initial checkbox the user left `node_modules/ (3 files)` selected (included)
- **THEN** a follow-up prompt asks whether to inspect `node_modules/`

#### Scenario: Expand replaces parent with direct children
- **WHEN** the user selects `node_modules/` for expansion
- **THEN** the next triage pass shows `node_modules/lodash/ (2 files)` and `node_modules/semver/ (1 file)` (or individual files if the directory is flat) instead of the collapsed `node_modules/` row

#### Scenario: No expand prompt when no collapsible selected dirs
- **WHEN** all selected entries after the initial checkbox are individual files (no collapsed directories)
- **THEN** no expand prompt is shown and the flow proceeds to confirmation

#### Scenario: Expand cycle terminates on user decline
- **WHEN** the user answers "no" to the expand prompt
- **THEN** the triage flow proceeds to confirmation with the current selection state

---

### Requirement: Confirmed exclusions are written to .npmignore
After triage and confirmation, the CLI SHALL write the excluded entries to `.npmignore`. If `.npmignore` already exists, entries are appended; the file is not clobbered. Entries are deduplicated before writing. For a collapsed directory entry that was excluded (not expanded), the directory name is written with a trailing `/` (e.g., `node_modules/`). For individual file entries, the exact path is written.

#### Scenario: .npmignore created when absent
- **WHEN** no `.npmignore` exists and the user excludes `node_modules/ (3 files)`
- **THEN** `.npmignore` is created containing `node_modules/`

#### Scenario: .npmignore appended when present
- **WHEN** `.npmignore` already contains `*.log` and the user excludes `.env`
- **THEN** `.npmignore` contains both `*.log` and `.env` (original content preserved)

#### Scenario: Duplicate entries not written
- **WHEN** `.npmignore` already contains `node_modules/` and the user again excludes `node_modules/`
- **THEN** `node_modules/` appears only once in the final `.npmignore`

#### Scenario: Expanded and excluded child paths written individually
- **WHEN** the user expands `node_modules/` and then excludes `node_modules/lodash/` but keeps `node_modules/semver/`
- **THEN** `.npmignore` contains `node_modules/lodash/` (not `node_modules/`)

---

### Requirement: Violation check is re-run after .npmignore is written
After writing `.npmignore`, the CLI SHALL re-run the tarball violation check. If no violations remain, a success message is shown and the flow completes normally. If violations still exist (e.g., the user kept some excluded entries in the package intentionally), the triage flow is NOT re-entered; a summary of remaining violations is printed.

#### Scenario: Re-run shows zero violations
- **WHEN** `.npmignore` was written and the re-run finds no violation-tier entries
- **THEN** the CLI prints a confirmation that the tarball is clean and exits with code 0

#### Scenario: Re-run shows remaining violations
- **WHEN** `.npmignore` was written but some violation-tier entries were intentionally kept
- **THEN** the CLI prints the remaining violations as an informational summary and exits with code 1 (consistent with existing violation exit behavior)
