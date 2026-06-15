## ADDED Requirements

### Requirement: Early gate informs user before making any changes
Before making any changes, the wizard SHALL display a summary of what was detected in the current directory and ask for confirmation. The summary SHALL include: (1) the absolute path of the current working directory, (2) the `SKILL.md` status using context-aware detection (root found, nested found with path, multiple found with count, or not found anywhere), (3) whether a `package.json` already exists, (4) the detected git user name (or "(not detected)" if unavailable). Declining SHALL print manual setup instructions and exit with code 0.

#### Scenario: Detection context shown at gate — SKILL.md at root
- **WHEN** the early gate is displayed and `SKILL.md` exists at the project root
- **THEN** the output includes the absolute current working directory path, `SKILL.md: found`, package.json presence, and detected git user

#### Scenario: Detection context shown at gate — SKILL.md in subdirectory only
- **WHEN** the early gate is displayed and no root `SKILL.md` exists but one is found inside a subdirectory (e.g. `skill/my-skill/SKILL.md`)
- **THEN** the `SKILL.md:` line reads `found in skill/my-skill/` rather than `not found`

#### Scenario: Detection context shown at gate — multiple SKILL.md files
- **WHEN** the early gate is displayed and `SKILL.md` files are found in two or more subdirectories
- **THEN** the `SKILL.md:` line reads `found in N locations` where N is the number of discovered directories

#### Scenario: Detection context shown at gate — no SKILL.md anywhere
- **WHEN** the early gate is displayed and no `SKILL.md` exists anywhere in the project
- **THEN** the `SKILL.md:` line reads `not found`

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
The wizard SHALL collect the following fields via interactive prompts in this order: package name, version, description, author, repository URL, license, skill content path. Each field SHALL have a sensible default derived from detection results. The `Description` prompt message SHALL read `Description (optional):` and the `Author` prompt message SHALL read `Author (optional):` to signal that blank input is accepted.

#### Scenario: Package name default from directory
- **WHEN** no `package.json` exists
- **THEN** the package name prompt defaults to the kebab-case form of the current directory name

#### Scenario: Version default
- **WHEN** no existing `version` field is detected
- **THEN** the version prompt defaults to `0.1.0`

#### Scenario: Author default from git config
- **WHEN** `git config user.name` and `git config user.email` both succeed
- **THEN** the author prompt defaults to `Name <email>` format

#### Scenario: Skill content path default — single-skill
- **WHEN** `skillet.skillDir` exists in an existing `package.json`, or a `skill/` subfolder exists, and `discoveredSkillDirs.length <= 1`
- **THEN** the skill content path prompt defaults to that value

#### Scenario: Skill content path prompt skipped — multi-skill
- **WHEN** `discoveredSkillDirs.length > 1`
- **THEN** the skill content path input prompt is NOT shown to the user

#### Scenario: Package name supplied as CLI argument
- **WHEN** the user runs `npm create skillet my-cooking-skill`
- **THEN** the package name prompt defaults to `my-cooking-skill`, taking precedence over the kebab-case directory name default

#### Scenario: Description prompt message includes optional label
- **WHEN** the wizard displays the Description prompt
- **THEN** the prompt message reads `Description (optional):`

#### Scenario: Author prompt message includes optional label
- **WHEN** the wizard displays the Author prompt
- **THEN** the prompt message reads `Author (optional):`

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
The wizard SHALL set up the npm package using only `npm init -y` and `npm pkg set` commands, plus direct file writes for `bin/cli.js`. It SHALL NOT write or overwrite `package.json` directly via `fs.writeFile` or `JSON.stringify`. For multi-skill packages, `npm pkg set skillet.skills=<value>` SHALL be used instead of `npm pkg set skillet.skillDir=<value>`. When `description` or `author` is empty (the user pressed Enter without typing a value), those fields SHALL be omitted from the `npm pkg set` call entirely — the field is left at whatever value `npm init -y` wrote (or absent if no `npm init` ran). When `repositoryUrl` is empty, `repository.url` and `repository.type` SHALL likewise be omitted (existing behaviour, unchanged).

#### Scenario: No existing package.json
- **WHEN** no `package.json` exists before execution
- **THEN** the wizard runs `npm init -y` to create one before running `npm pkg set` commands

#### Scenario: Existing package.json
- **WHEN** a `package.json` exists before execution
- **THEN** the wizard skips `npm init` and runs only `npm pkg set` commands

#### Scenario: All required fields are set — single-skill
- **WHEN** execution completes for a single-skill package and the user supplied non-empty values for all prompts
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license`, `type: "module"`, `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skillDir` (set to the skill content path), and a `bin` field with the package name pointing to `./bin/cli.js`

#### Scenario: All required fields are set — multi-skill
- **WHEN** execution completes for a multi-skill package and the user supplied non-empty values for all prompts
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license`, `type: "module"`, `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skills` (set to the parent directory or JSON array), and a `bin` field — and does NOT contain `skillet.skillDir`

#### Scenario: Repository URL left blank
- **WHEN** the user leaves the repository URL prompt empty
- **THEN** the wizard skips `npm pkg set repository.url` and `npm pkg set repository.type` — neither field is written to `package.json`

#### Scenario: Description left blank
- **WHEN** the user leaves the description prompt empty (presses Enter without typing a value)
- **THEN** the wizard does NOT include `description=` in the `npm pkg set` argument list — the field retains whatever value `npm init -y` wrote (typically an empty string) and the wizard does NOT crash

#### Scenario: Author left blank
- **WHEN** the user leaves the author prompt empty (presses Enter without typing a value)
- **THEN** the wizard does NOT include `author=` in the `npm pkg set` argument list — the field retains whatever value `npm init -y` wrote and the wizard does NOT crash

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

---

### Requirement: npm init stdout is suppressed during package initialization
When the wizard runs `npm init -y` to create a new `package.json`, the command's stdout SHALL be captured (not forwarded to the terminal). The "Wrote to <path>/package.json:" block that npm prints SHALL NOT appear in the terminal output. npm's stderr SHALL remain inherited so that error messages still reach the terminal.

#### Scenario: npm init stdout does not appear in terminal
- **WHEN** the wizard runs `npm init -y` in a directory with no existing `package.json`
- **THEN** the "Wrote to" line and the default JSON block printed by npm are not visible in terminal output

#### Scenario: npm init stderr is still inherited
- **WHEN** `npm init -y` produces output on stderr (e.g., warnings or errors)
- **THEN** that stderr output is still forwarded to the terminal

---

### Requirement: Final package.json content is printed after all pkg set commands complete
After all `npm pkg set` commands have run and the package fields are in their final configured state, the wizard SHALL read `package.json` from disk and print its full content to stdout with a label `package.json written:`. This output SHALL appear before the bin/cli.js creation step.

#### Scenario: Displayed package.json matches configured values
- **WHEN** the wizard completes the seasoning step (all npm pkg set commands)
- **THEN** the terminal output includes the final `package.json` content, showing the user-configured values for name, version, description, author, license, and type (not npm's defaults)

#### Scenario: Displayed version matches user input
- **WHEN** the user configures version as `0.1.0`
- **THEN** the printed package.json shows `"version": "0.1.0"`, not `"version": "1.0.0"`

#### Scenario: Displayed license matches user input
- **WHEN** the user configures license as `MIT`
- **THEN** the printed package.json shows `"license": "MIT"`, not `"license": "ISC"`

#### Scenario: Displayed type matches configured value
- **WHEN** the wizard completes the seasoning step
- **THEN** the printed package.json shows `"type": "module"`, not `"type": "commonjs"`

#### Scenario: Displayed author matches user input
- **WHEN** the user configures author as `Name <email>`
- **THEN** the printed package.json shows the configured author value, not an empty string
