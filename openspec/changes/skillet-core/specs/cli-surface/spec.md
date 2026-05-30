## ADDED Requirements

### Requirement: run() constructs and dispatches a commander CLI
The library SHALL export a `run(options)` function that builds a `commander`-based CLI, registers `install`, `update`, `uninstall`, and `list` subcommands, parses `argv`, and dispatches to the appropriate handler. `argv` defaults to `process.argv` if not provided.

#### Scenario: run() exits with error and prints help on unknown command
- **WHEN** `run()` is called with an unrecognised subcommand in argv
- **THEN** the full help text is printed, an error message is printed, and the process exits with a non-zero code

#### Scenario: run() requires both skillDir and pkg
- **WHEN** `run({ skillDir, pkg })` is called with both arguments present
- **THEN** `skillDir` is used as the source for all commands and `pkg.name`/`pkg.version` populate the `source` field in manifests

#### Scenario: run() throws if pkg is missing
- **WHEN** `run({ skillDir })` is called without `pkg`
- **THEN** the library throws an error at startup indicating `pkg` is required

### Requirement: install command detects targets and prompts by default
When run interactively with no `--target` flag, `install` SHALL detect available targets, present a multi-select prompt, and install to all selected targets.

#### Scenario: Multi-select prompt lists detected targets
- **WHEN** `install` is run interactively without `--target`
- **THEN** a checkbox prompt listing all detected targets (plus the generic `agents` fallback) is shown

#### Scenario: Non-interactive install installs to all detected targets
- **WHEN** `install` is run in a non-TTY environment without `--target`
- **THEN** all detected targets are installed to without prompting

#### Scenario: --target flag skips detection prompt
- **WHEN** `install --target claude --target agents` is passed
- **THEN** only those two targets are installed, with no prompt shown

#### Scenario: --yes flag suppresses selection prompt
- **WHEN** `install --yes` is run interactively
- **THEN** all detected targets are selected without showing the multi-select prompt

### Requirement: Scope defaults when --scope is not specified
When `--scope` is not passed, the library SHALL determine the scope using the following precedence rules applied per target:
1. If the target supports only one scope, that scope is used automatically without prompting.
2. If the target supports both scopes and the run is non-interactive (no TTY), the scope defaults to `user`.
3. If the target supports both scopes and the run is interactive, the user is prompted to choose.

#### Scenario: Single-scope target does not prompt for scope
- **WHEN** `install --target copilot` is run without `--scope`
- **THEN** project scope is used automatically and no scope prompt is shown

#### Scenario: Dual-scope target defaults to user in CI
- **WHEN** `install --target claude` is run without `--scope` in a non-TTY environment
- **THEN** user scope is selected automatically

#### Scenario: Dual-scope target prompts interactively
- **WHEN** `install --target claude` is run without `--scope` in an interactive TTY session
- **THEN** the user is prompted to choose between user and project scope

### Requirement: --scope flag controls install scope
When `--scope user` or `--scope project` is passed, the library SHALL install to that scope for all selected targets. An error SHALL be raised if a selected target does not support the requested scope.

#### Scenario: --scope user installs to home directory path
- **WHEN** `install --target claude --scope user` is run
- **THEN** the skill is installed to `~/.claude/skills/<name>/`

#### Scenario: --scope project installs to cwd path
- **WHEN** `install --target claude --scope project` is run
- **THEN** the skill is installed to `.claude/skills/<name>/` relative to cwd

#### Scenario: Unsupported scope raises error
- **WHEN** `install --target copilot --scope user` is run
- **THEN** the command exits with an error explaining that the copilot target does not support user scope

### Requirement: uninstall command finds and removes existing installs
`uninstall` SHALL scan all known target locations for existing installs of the skill, present a multi-select prompt (all selected by default), and remove chosen installs.

#### Scenario: Multi-select for uninstall
- **WHEN** the skill is installed in two targets and `uninstall` is run interactively
- **THEN** both are listed with all selected by default; the user can deselect before confirming

#### Scenario: --yes uninstalls all without prompting
- **WHEN** `uninstall --yes` is run
- **THEN** all found installs are removed without a confirmation prompt

### Requirement: list command shows install status
`list` SHALL print every location where the skill is installed, the stored `contentHash`, the current drift status (`pristine` / `modified` / `unknown`), and a `stale` flag when the source hash differs from the manifest hash.

#### Scenario: list output includes install path and hash
- **WHEN** `list` is run and an install exists
- **THEN** each install is shown with its absolute path and `contentHash`

#### Scenario: list shows drift status per install
- **WHEN** `list` is run
- **THEN** each install displays its drift status

### Requirement: extendProgram hook for author-defined subcommands
If an `extendProgram(program, ctx)` hook is provided, the library SHALL call it with the `commander` program instance after built-in commands are registered, allowing authors to add custom subcommands.

#### Scenario: Custom subcommand added via hook
- **WHEN** `extendProgram` adds a `verify` subcommand
- **THEN** running `<skill> verify` invokes that subcommand's handler

### Requirement: transform hook called before adapters see the skill
If a `transform(skill)` hook is provided, the library SHALL call it after normalization and use the returned skill object for all subsequent operations.

#### Scenario: transform can mutate skill metadata
- **WHEN** `transform` replaces `skill.name` with a computed value
- **THEN** all adapters and manifests use the transformed name
