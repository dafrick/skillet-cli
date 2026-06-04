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
The wizard SHALL set up the npm package using only `npm init -y` and `npm pkg set` commands, plus direct file writes for `bin/cli.js`. It SHALL NOT write or overwrite `package.json` directly via `fs.writeFile` or `JSON.stringify`.

#### Scenario: No existing package.json
- **WHEN** no `package.json` exists before execution
- **THEN** the wizard runs `npm init -y` to create one before running `npm pkg set` commands

#### Scenario: Existing package.json
- **WHEN** a `package.json` exists before execution
- **THEN** the wizard skips `npm init` and runs only `npm pkg set` commands

#### Scenario: All required fields are set
- **WHEN** execution completes successfully
- **THEN** `package.json` contains: `name`, `version`, `description`, `author`, `license`, `type: "module"`, `engines.node: ">=24"`, `repository.type`, `repository.url`, `skillet.skillDir` (set to the skill content path), and a `bin` field with the package name pointing to `./bin/cli.js`

#### Scenario: Repository URL left blank
- **WHEN** the user leaves the repository URL prompt empty
- **THEN** the wizard skips `npm pkg set repository.url` and `npm pkg set repository.type` — neither field is written to `package.json`

---

### Requirement: bin/cli.js is created and made executable
The wizard SHALL write `bin/cli.js` as a valid ESM entry point with a `#!/usr/bin/env node` shebang, loading `pkg` from `package.json` via `createRequire`, importing `run` from `@skillet-cli/core`, and calling `run({ skillDir, pkg })`. The file SHALL be made executable (`chmod 755`).

#### Scenario: bin/cli.js is written correctly
- **WHEN** execution completes
- **THEN** `bin/cli.js` exists, starts with `#!/usr/bin/env node`, loads `pkg` via `createRequire(import.meta.url)('../package.json')`, imports `run` from `@skillet-cli/core`, and calls `run({ skillDir: fileURLToPath(new URL('../skill/', import.meta.url)), pkg })` where `skill/` is replaced with the configured skill content path value from the wizard

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

### Requirement: Skill directory setup when SKILL.md is in root
After npm execution completes, when `SKILL.md` exists in the current directory root (not inside `skill/`), the wizard SHALL offer to move relevant files into a `skill/` subfolder. This phase has its own preview and confirmation gate — no files are moved until the user explicitly confirms the pre-move summary.

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

#### Scenario: User declines at skilletize preview
- **WHEN** the user answers "no" at the skilletize preview
- **THEN** the wizard prints "No files moved. Your npm package is set up." and exits with code 0

---

### Requirement: Wizard displays next steps on completion
After successful execution, the wizard SHALL print a completion message with the two recommended next steps: test locally (`npx . install`) and publish (`npm publish`).

#### Scenario: Completion output
- **WHEN** all execution steps succeed
- **THEN** the wizard prints a success message followed by `npx . install` and `npm publish` as labeled next steps

---

### Requirement: Wizard visual identity uses SKILLETIZE wordmark
The wizard SHALL display a figlet ANSI Shadow wordmark rendering "SKILLETIZE" with the ember gradient on TTY terminals. The tagline SHALL be `Package <name> for any AI agent` once a package name is known, falling back to `Package your skill for any AI agent` before detection. Attribution SHALL read `Powered by Skillet CLI v{version}` with the standard OSC8 link. In CI or non-TTY environments the header SHALL be suppressed.

#### Scenario: TTY header
- **WHEN** the wizard runs in a TTY terminal
- **THEN** the ANSI Shadow "SKILLETIZE" wordmark with ember gradient is printed, followed by tagline and attribution

#### Scenario: Non-TTY / CI suppression
- **WHEN** stdout is not a TTY or CI environment variable is set
- **THEN** no header, wordmark, or color output is emitted
