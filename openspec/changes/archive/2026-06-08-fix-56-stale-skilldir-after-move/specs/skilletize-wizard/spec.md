## MODIFIED Requirements

### Requirement: Skill directory setup when SKILL.md is in root
After npm execution completes, when `SKILL.md` exists in the current directory root (not inside `skill/`), the wizard SHALL offer to move relevant files into a `skill/` subfolder. This phase has its own preview and confirmation gate — no files are moved until the user explicitly confirms the pre-move summary. After files are moved, the wizard SHALL update `bin/cli.js` to reference `skill/` as the skill URL and SHALL update `package.json`'s `skillet.skillDir` field to `./skill/` so that both artifacts reflect the actual post-move skill location.

#### Scenario: skill/ subfolder already exists
- **WHEN** a `skill/` subfolder already exists in the current directory
- **THEN** the wizard skips the skill directory setup step entirely and prints a single line noting that `skill/` was found

#### Scenario: Directory has 12 or fewer items — checkbox selection
- **WHEN** `SKILL.md` is in the root and the directory contains 12 or fewer items
- **THEN** the wizard shows a checkbox list of all directory items; `SKILL.md` and any folders named `resources`, `assets`, or `templates` are pre-selected; README.md, dotfiles, lock files, and dot-folders are not pre-selected

#### Scenario: Directory has more than 12 items — collapsed confirm
- **WHEN** `SKILL.md` is in the root and the directory contains more than 12 items
- **THEN** the wizard shows a single confirm prompt offering to move only `SKILL.md` and `resources/` (if present) into `skill/`; the prompt explicitly names any other skill-related directories found (e.g., `assets/`, `templates/`) that will NOT be moved, informing the user they can move those manually

#### Scenario: Skilletize preview before move
- **WHEN** the user has confirmed the file selection (checkbox or confirm)
- **THEN** the wizard shows a pre-move summary listing exactly which files and folders will be moved and asks for final confirmation before touching the filesystem

#### Scenario: User confirms file move
- **WHEN** the user confirms the skilletize preview
- **THEN** the selected files and folders are moved into a newly created `skill/` subfolder and the wizard prints which files were moved

#### Scenario: Post-move bin/cli.js update
- **WHEN** the user confirms the file move and all files are moved successfully
- **THEN** the wizard rewrites `bin/cli.js` so that the `skillDir` URL points to `skill/` (i.e., `new URL('../skill/', import.meta.url)`)

#### Scenario: Post-move package.json update
- **WHEN** the user confirms the file move and all files are moved successfully
- **THEN** the wizard runs `npm pkg set skillet.skillDir=./skill/` so that `package.json`'s `skillet.skillDir` field reflects the new skill location

#### Scenario: User declines at skilletize preview
- **WHEN** the user answers "no" at the skilletize preview
- **THEN** the wizard prints "No files moved. Your npm package is set up." and exits with code 0

#### Scenario: No files selected
- **WHEN** the user selects no files in the checkbox
- **THEN** the wizard prints "No files selected. Your npm package is set up." and returns without updating bin/cli.js or package.json
