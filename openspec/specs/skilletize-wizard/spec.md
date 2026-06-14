## ADDED Requirements

### Requirement: Early gate informs user before making any changes
Before making any changes, the wizard SHALL display a summary of what was detected in the current directory and ask for confirmation. The summary SHALL include: (1) the absolute path of the current working directory, (2) whether `SKILL.md` was found, (3) whether a `package.json` already exists, (4) the detected git user name (or "(not detected)" if unavailable). Declining SHALL print manual setup instructions and exit with code 0.

#### Scenario: Detection context shown at gate
- **WHEN** the early gate is displayed
- **THEN** the output includes the absolute current working directory path, SKILL.md presence, package.json presence, and detected git user

#### Scenario: User declines early gate
- **WHEN** the user runs `create-skillet` and answers "no" to the initial confirmation
- **THEN** the wizard prints manual setup instructions (npm init, npm pkg set, bin/cli.js steps) and exits with code 0 without making any changes

#### Scenario: User accepts early gate
- **WHEN** the user runs `create-skillet` and answers "yes" to the initial confirmation
- **THEN** the wizard proceeds to the NPM configuration phase

---

### Requirement: Wizard detects environment state before prompting
During detection (before any prompts), the wizard SHALL silently check: (1) whether a `package.json` exists in the current directory, (2) whether a `skill/` subfolder exists, (3) whether a `SKILL.md` exists in the root, (4) the git remote URL via `git remote get-url origin`, (5) the git user name and email via `git config`, and (6) the `skillet.skillDir` field from an existing `package.json`. Detection failures SHALL be swallowed — missing data leaves the corresponding prompt field empty for manual entry.

#### Scenario: Git remote is present
- **WHEN** `git remote get-url origin` succeeds
- **THEN** the detected URL is normalized to `git+https://` format and pre-filled as the default for the repository URL prompt

#### Scenario: Git remote is absent or git is not initialized
- **WHEN** `git remote get-url origin` exits non-zero
- **THEN** the repository URL prompt has no default and the user must enter it manually

#### Scenario: package.json already exists
- **WHEN** a `package.json` is present in the current directory
- **THEN** the wizard reads existing `name`, `version`, `author`, `description`, and `skillet.skillDir` fields and uses them as prompt defaults instead of derived values

---

### Requirement: Configuration prompts collect package metadata
The wizard SHALL collect the following fields via interactive prompts in this order: package name, version, description, author, repository URL, license, skill content path. Each field SHALL have a sensible default derived from detection results.

#### Scenario: Package name default from directory
- **WHEN** no `package.json` exists
- **THEN** the package name prompt defaults to the kebab-case form of the current directory name

#### Scenario: Version default
- **WHEN** no existing `version` field is detected
- **THEN** the version prompt defaults to `0.1.0`

#### Scenario: Author default from git config
- **WHEN** `git config user.name` and `git config user.email` both succeed
- **THEN** the author prompt defaults to `Name <email>` format

#### Scenario: Skill content path default
- **WHEN** `skillet.skillDir` exists in an existing `package.json`, or a `skill/` subfolder exists
- **THEN** the skill content path prompt defaults to that value

#### Scenario: Package name supplied as CLI argument
- **WHEN** the user runs `npm create skillet my-cooking-skill`
- **THEN** the package name prompt defaults to `my-cooking-skill`, taking precedence over the kebab-case directory name default

---

### Requirement: NPM preview step shows a summary before npm execution
After all configuration prompts, the wizard SHALL display a human-readable summary of the npm commands and files that will be created or modified, and ask for confirmation before running any npm commands or writing any files.

#### Scenario: User reviews and proceeds
- **WHEN** the user confirms the NPM preview
- **THEN** the wizard proceeds to npm execution

#### Scenario: User declines at NPM preview
- **WHEN** the user answers "no" at the NPM preview confirmation
- **THEN** the wizard prints "No changes made. Re-run `create-skillet` to start over." and exits with code 0 without touching the filesystem

---

### Requirement: Execution uses only native npm commands
The wizard SHALL set up the npm package using only `npm init -y` and `npm pkg set` commands, plus direct file writes for `bin/cli.js`. It SHALL NOT write or overwrite `package.json` directly via `fs.writeFile` or `JSON.stringify`. When running `npm init -y`, the wizard SHALL pass `--init-license=<selected-license>` and `--init-type=module` so that the user-selected license and the correct module type are written directly by npm init; npm's defaults of ISC and commonjs are never persisted.

#### Scenario: No existing package.json
- **WHEN** no `package.json` exists before execution
- **THEN** the wizard runs `npm init -y --init-license=<selected-license> --init-type=module` to create one before running `npm pkg set` commands

#### Scenario: Existing package.json
- **WHEN** a `package.json` exists before execution
- **THEN** the wizard skips `npm init` and runs only `npm pkg set` commands

#### Scenario: All required fields are set
- **WHEN** execution completes successfully
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license` (set to the value the user selected in the wizard, e.g. `MIT` — not npm's default of `ISC`), `type: "module"` (not npm's default of `commonjs`), `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skillDir` (set to the skill content path), and a `bin` field with the package name pointing to `./bin/cli.js`

#### Scenario: Repository URL left blank
- **WHEN** the user leaves the repository URL prompt empty
- **THEN** the wizard skips `npm pkg set repository.url` and `npm pkg set repository.type` — neither field is written to `package.json`

#### Scenario: License field reflects user selection after fresh init
- **WHEN** no `package.json` exists before execution and the user selected `MIT` as the license
- **THEN** after execution completes, the `license` field in `package.json` is `"MIT"`, not `"ISC"`

#### Scenario: Type field is module after fresh init
- **WHEN** no `package.json` exists before execution
- **THEN** after execution completes, the `type` field in `package.json` is `"module"`, not `"commonjs"`

---

### Requirement: bin/cli.js is created and made executable
The wizard SHALL write `bin/cli.js` as a valid ESM entry point with a `#!/usr/bin/env node` shebang, loading `pkg` from `package.json` via `createRequire`, importing `run` from `@skillet-cli/core`, and calling `run({ pkg })` with no `skillDir` argument. The file SHALL be made executable (`chmod 755`). The skill location is read at runtime from `package.json`'s `skillet.skillDir` field.

#### Scenario: Generated `bin/cli.js` contains no skillDir argument
- **WHEN** the wizard completes and `bin/cli.js` is written
- **THEN** the file calls `await run({ pkg })` with no `skillDir` property

#### Scenario: Generated `bin/cli.js` contains no URL or path resolution
- **WHEN** the wizard completes and `bin/cli.js` is written
- **THEN** the file does not import `fileURLToPath` or use `new URL(...)` for path resolution

#### Scenario: `package.json` is the source of truth after wizard completes
- **WHEN** the wizard has run and `package.json` contains `skillet.skillDir` and `bin/cli.js` contains `await run({ pkg })`
- **THEN** running `npx . install` succeeds, reading skill location from `package.json`

#### Scenario: bin/cli.js is executable
- **WHEN** execution completes
- **THEN** `bin/cli.js` has execute permission (`chmod 755`)

---

### Requirement: @skillet-cli/core is installed as a dependency
After writing `bin/cli.js`, the wizard SHALL run `npm install @skillet-cli/core` to add it as a runtime dependency.

#### Scenario: Dependency is added
- **WHEN** execution completes
- **THEN** `package.json` lists `@skillet-cli/core` under `dependencies`

---

### Requirement: Install step emits plain progress output, not a spinner
The `create-skillet` scaffold step that installs `@skillet-cli/core` SHALL write a plain-text progress line to stdout via `process.stdout.write` immediately before invoking npm install, and a plain-text confirmation line after successful completion. The step SHALL NOT use `spinner.start` or `spinner.succeed` for this install step. The `spawnSync` call SHALL retain `stdio: 'inherit'` so npm's own output reaches the terminal.

#### Scenario: Install step produces a visible progress message
- **WHEN** the wizard reaches the npm install step
- **THEN** a plain-text line mentioning `@skillet-cli/core` is written to stdout before the install begins, visible in both TTY and non-TTY contexts

#### Scenario: Install step does not use spinner.start before npm install
- **WHEN** the wizard reaches the npm install step
- **THEN** `spinner.start` is NOT called immediately before the `spawnSync` npm install call

#### Scenario: npm install output passes through to terminal in TTY context
- **WHEN** the wizard runs the npm install step in a TTY environment
- **THEN** npm's stdout and stderr are inherited (passed through directly) rather than captured

---

### Requirement: Skill directory setup when SKILL.md is in root
After npm execution completes, when `SKILL.md` exists in the current directory root (not inside `skill/`), the wizard SHALL offer to move relevant files into a `skill/` subfolder. This phase has its own preview and confirmation gate — no files are moved until the user explicitly confirms the pre-move summary. After files are moved, the wizard SHALL print a line confirming the updated skill directory path (e.g., `  skillDir updated to: ./skill/`), then update `package.json`'s `skillet.skillDir` field to `./skill/`. The wizard SHALL NOT rewrite `bin/cli.js` after the move step — since `bin/cli.js` no longer embeds the skill path, it remains valid regardless of the move outcome.

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

---

### Requirement: Wizard displays next steps on completion
After successful execution, the wizard SHALL print a completion message with the two recommended next steps: test locally (`npx . install`) and publish (`npm publish`).

#### Scenario: Completion output
- **WHEN** all execution steps succeed
- **THEN** the wizard prints a success message followed by `npx . install` and `npm publish` as labeled next steps

---

### Requirement: Wizard exits non-zero on execution failure
When any execution step fails (npm init, npm pkg set, bin/cli.js write, chmod, npm install, mkdir, file move), the wizard SHALL print a human-readable error message to stderr describing which step failed and exit with code 1. The wizard SHALL NOT exit with code 0 after a failure.

#### Scenario: npm install fails
- **WHEN** `npm install @skillet-cli/core` exits non-zero
- **THEN** the wizard prints an error message to stderr (e.g., `Error: npm install @skillet-cli/core failed. Run it manually and re-run create-skillet if needed.`) and exits with code 1

#### Scenario: File move fails
- **WHEN** moving a selected file into `skill/` throws a filesystem error
- **THEN** the wizard prints the failed filename and error to stderr and exits with code 1, leaving any already-moved files in their moved location (no rollback)

---

### Requirement: Wizard visual identity uses SKILLETIZE wordmark
The wizard SHALL display a figlet ANSI Shadow wordmark rendering "SKILLETIZE" with the ember gradient on TTY terminals. The tagline SHALL be `Package <name> for any AI agent` once a package name is known, falling back to `Package your skill for any AI agent` before detection. Attribution SHALL read `Powered by Skillet CLI v{version}` with the standard OSC8 link. In CI or non-TTY environments the header SHALL be suppressed.

#### Scenario: TTY header — detected name in tagline
- **WHEN** the wizard runs in a TTY terminal
- **THEN** the ANSI Shadow "SKILLETIZE" wordmark with ember gradient is printed, followed by the tagline `Package <detected-name> for any AI agent` (where `<detected-name>` is the package name from an existing `package.json`, or the kebab-case directory name if no `package.json` exists), followed by the attribution line

#### Scenario: Non-TTY / CI suppression
- **WHEN** stdout is not a TTY or CI environment variable is set
- **THEN** no header, wordmark, or color output is emitted
