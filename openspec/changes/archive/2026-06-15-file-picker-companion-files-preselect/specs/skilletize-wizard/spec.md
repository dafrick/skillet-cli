## MODIFIED Requirements

### Requirement: Skill directory setup when SKILL.md is in root
After npm execution completes, when `SKILL.md` exists in the current directory root (not inside `skill/`), the wizard SHALL offer to move relevant files into a `skill/` subfolder. This phase has its own preview and confirmation gate — no files are moved until the user explicitly confirms the pre-move summary. After files are moved, the wizard SHALL print a line confirming the updated skill directory path (e.g., `  skillDir updated to: ./skill/`), then update `package.json`'s `skillet.skillDir` field to `./skill/`. The wizard SHALL NOT rewrite `bin/cli.js` after the move step — since `bin/cli.js` no longer embeds the skill path, it remains valid regardless of the move outcome.

#### Scenario: skill/ subfolder already exists
- **WHEN** a `skill/` subfolder already exists in the current directory
- **THEN** the wizard skips the skill directory setup step entirely and prints a single line noting that `skill/` was found

#### Scenario: Directory has 12 or fewer items — checkbox selection with blocklist pre-selection
- **WHEN** `SKILL.md` is in the root and the directory contains 12 or fewer items
- **THEN** the wizard shows a checkbox list of all directory items; items are pre-selected unless they appear on the exclusion blocklist; the blocklist consists of: `README.md`, dotfiles and dot-folders (names starting with `.`), lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`), `package.json`, `node_modules/`, and `bin/`; all other items including `SKILL.md` and any companion directories such as `scripts/`, `prompts/`, `examples/`, `assets/`, `templates/`, and `resources/` are pre-selected by default

#### Scenario: Directory has more than 12 items — collapsed confirm
- **WHEN** `SKILL.md` is in the root and the directory contains more than 12 items
- **THEN** the wizard shows a single confirm prompt offering to move only `SKILL.md` and `resources/` (if present) into `skill/`; the prompt explicitly names any other skill-related directories found (e.g., `assets/`, `templates/`) that will NOT be moved, informing the user they can move those manually

#### Scenario: Skilletize preview before move
- **WHEN** the user has confirmed the file selection (checkbox or confirm)
- **THEN** the wizard shows a pre-move summary listing exactly which files and folders will be moved and asks for final confirmation before touching the filesystem

#### Scenario: User confirms file move
- **WHEN** the user confirms the skilletize preview
- **THEN** the selected files and folders are moved into a newly created `skill/` subfolder and the wizard prints which files were moved

#### Scenario: Post-move skillDir confirmation
- **WHEN** all selected files have been moved into `skill/`
- **THEN** the wizard prints a line confirming the updated skill directory path (e.g., `  skillDir updated to: ./skill/`) before running `npm pkg set skillet.skillDir=./skill/`

#### Scenario: `bin/cli.js` is not modified after the file-move step
- **WHEN** the user confirms the file move and files are moved into `skill/`
- **THEN** `bin/cli.js` is not rewritten; its content is identical to what was written during scaffold

#### Scenario: Post-move package.json update
- **WHEN** the user confirms the file move and all files are moved successfully
- **THEN** the wizard runs `npm pkg set skillet.skillDir=./skill/` so that `package.json`'s `skillet.skillDir` field reflects the new skill location

#### Scenario: User declines at skilletize preview
- **WHEN** the user answers "no" at the skilletize preview
- **THEN** the wizard prints "No files moved. Your npm package is set up." and exits with code 0

#### Scenario: No files selected
- **WHEN** the user selects no files in the checkbox
- **THEN** the wizard prints "No files selected. Your npm package is set up." and returns without updating package.json
