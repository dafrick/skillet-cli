## MODIFIED Requirements

### Requirement: Full header leads with a blank line before the wordmark
The full header (install and update commands, TTY only) SHALL begin with a blank line before the wordmark, providing visual separation from the shell prompt.

#### Scenario: Blank line precedes wordmark on install
- **WHEN** install runs in a TTY environment
- **THEN** a blank line appears between the shell prompt line and the first row of the wordmark

---

### Requirement: Full header renders description between wordmark and attribution
When `pkg.description` is set, the full header SHALL render a dimmed description line between the wordmark block and the attribution line. When `pkg.description` is absent or empty, no description line SHALL be emitted — not even a blank line.

#### Scenario: Description present — rendered below wordmark
- **WHEN** install runs with `pkg.description` set to `"My skill description"`
- **THEN** the dimmed text `My skill description` appears on the line immediately following the wordmark and before the attribution line

#### Scenario: Description absent — no extra line
- **WHEN** install runs and `pkg.description` is not set
- **THEN** the attribution line appears immediately after the wordmark with no blank line between them

---

### Requirement: Light header omits pkg.version from the title
The light header (list and uninstall commands, TTY only) SHALL display only the resolved display name — no version number. The version remains accessible via `--version`.

#### Scenario: Light header shows name without version
- **WHEN** list runs with `pkg.version` set to `"1.2.0"` in a TTY environment
- **THEN** the title line does not contain `1.2.0`

---

### Requirement: Light header renders description inline with the title
When `pkg.description` is set, the light header title line SHALL be formatted as `NAME - description` (description in dim style). When `pkg.description` is absent or empty, the title line SHALL contain only the name with no ` - ` separator.

#### Scenario: Description present — inline with name
- **WHEN** list runs with `pkg.name` set to `"@acme/code-reviewer"` and `pkg.description` set to `"Reviews your code"`
- **THEN** the title line reads `CODE-REVIEWER - Reviews your code`

#### Scenario: Description absent — name only, no separator
- **WHEN** list runs and `pkg.description` is not set
- **THEN** the title line contains only `CODE-REVIEWER` with no trailing ` - `
