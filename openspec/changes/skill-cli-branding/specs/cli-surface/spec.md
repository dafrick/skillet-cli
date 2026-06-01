## ADDED Requirements

### Requirement: run() accepts verbMode and displayName options
The library SHALL accept an optional `verbMode: 'fun' | 'standard'` property and an optional `displayName: string` property in the options object passed to `run()`. When not provided, `verbMode` SHALL default to `'fun'`, preserving all existing cooking-verb behavior. When `displayName` is not provided, the display name is derived from `pkg.name` per the `skill-wordmark` derivation rules.

#### Scenario: verbMode defaults to fun when omitted
- **WHEN** `run({ skillDir, pkg })` is called without a `verbMode` property
- **THEN** cooking verbs (searing, baking, reheating, etc.) are used for all command spinner and log output

#### Scenario: verbMode standard switches to conventional verbs
- **WHEN** `run({ skillDir, pkg, verbMode: 'standard' })` is called
- **THEN** conventional English verb forms are used for all command spinner and log output in place of cooking verbs

#### Scenario: displayName overrides the name shown in headers
- **WHEN** `run({ skillDir, pkg, displayName: 'skillet' })` is called and `pkg.name` is `'@skillet-cli/core'`
- **THEN** all headers display `SKILLET` (uppercased from `displayName`) rather than `CORE` (which would be derived from `pkg.name`)

#### Scenario: displayName does not affect pkg-sourced fields
- **WHEN** `displayName` is provided
- **THEN** `pkg.name` is still used for the CI log prefix, manifest source field, and update notifier — only the header display name changes

---

### Requirement: Standard verb pools for install, update, uninstall, and detect
When `verbMode` is `'standard'`, the library SHALL use the following fixed verb forms (no random selection; there is one form per command):

| Command | Standard Active | Standard Done |
|---|---|---|
| install | Installing into `<target>`… | ✔ Installed |
| update | Updating `<target>`… | ✔ Updated |
| uninstall | Removing `<target>`… | ✔ Removed |
| detect | Detecting targets… | ✔ Found N targets |

In CI / non-TTY mode, the active form SHALL be lowercased and prefixed with `[pkg.name]`, consistent with the behavior of fun verbs in that mode.

#### Scenario: Standard install uses Installing/Installed in TTY
- **WHEN** `verbMode` is `'standard'` and install runs interactively
- **THEN** the spinner shows `Installing into <target>…` and completes with `✔ Installed    <target>   <path>`

#### Scenario: Standard install uses lowercase in CI mode
- **WHEN** `verbMode` is `'standard'` and install runs in a non-TTY environment
- **THEN** the log line reads `[pkg.name] installing into <target> (<scope>)…`

#### Scenario: Standard update uses Updating/Updated
- **WHEN** `verbMode` is `'standard'` and update runs
- **THEN** the spinner shows `Updating <target>…` and completes with `✔ Updated    <target>   <path>`

#### Scenario: Standard uninstall uses Removing/Removed
- **WHEN** `verbMode` is `'standard'` and uninstall runs
- **THEN** the spinner shows `Removing <target>…` and completes with `✔ Removed   <target>`

#### Scenario: Standard detect uses Detecting/Found
- **WHEN** `verbMode` is `'standard'` and target detection runs
- **THEN** the spinner shows `Detecting targets…` and completes with `✔ Found N target(s)`

---

### Requirement: Full header uses generated wordmark from resolved display name
When the full header is displayed (install and update commands, TTY only), the library SHALL render the wordmark using the `skill-wordmark` capability. The input to wordmark generation SHALL be `displayName` (uppercased) when provided, or the name derived from `pkg.name` otherwise. No hardcoded ASCII string SHALL be used.

#### Scenario: Full header wordmark reflects pkg.name
- **WHEN** install is run with `pkg.name` set to `"my-skill"` in a TTY environment
- **THEN** the full header shows a figlet ANSI Shadow wordmark for `"MY-SKILL"` with the Ember gradient, not the SKILLET wordmark

#### Scenario: Full header is suppressed in CI as before
- **WHEN** install runs in a non-TTY environment or CI is set
- **THEN** no header is displayed, consistent with existing behavior

---

### Requirement: Light header reads skill identity from resolved display name and pkg
When the light header is displayed (list and uninstall commands, TTY only), the library SHALL render the resolved display name (`displayName` uppercased when provided, otherwise the name derived from `pkg.name` per the `skill-wordmark` derivation rules) and `pkg.version` in place of the hardcoded `SKILLET v0.1.0` prefix.

#### Scenario: Light header shows derived skill name and version
- **WHEN** list is run with `pkg.name` set to `"@acme/code-reviewer"` and `pkg.version` set to `"1.2.0"` in a TTY environment
- **THEN** the light header first line reads `CODE-REVIEWER v1.2.0  ·  <pkg.description>` with `CODE-REVIEWER` rendered in Ember 500 bold

#### Scenario: Light header description comes from pkg.description
- **WHEN** list is run and `pkg.description` is set
- **THEN** the value of `pkg.description` appears after the `·` separator in dim style

---

### Requirement: Attribution line appears in all TTY headers
Every header variant (full and light) SHALL include a single attribution line rendered immediately below the wordmark or name line, before any other content. The attribution line SHALL NOT appear in CI or non-TTY environments (consistent with header suppression rules).

The attribution line format: `Built with Skillet` in Iris Bright bold, followed by `·` and a brief descriptor and URL in `chalk.dim`. Final copy and URL are specified in the CLI Design System reference.

#### Scenario: Attribution line appears below full header wordmark
- **WHEN** install runs in TTY and the full header is displayed
- **THEN** the line immediately following the wordmark block reads the attribution string in Iris Bright + dim

#### Scenario: Attribution line appears below light header name line
- **WHEN** list runs in TTY and the light header is displayed
- **THEN** the line immediately following the name line reads the attribution string

#### Scenario: Attribution line is suppressed in CI/non-TTY
- **WHEN** install runs in a non-TTY environment or CI is set
- **THEN** no attribution line is emitted

---

### Requirement: Rotating tagline pool is suppressed
The library SHALL NOT render any tagline from the Skillet tagline pool in any header variant. Neither the full header nor the light header SHALL include a rotating tagline line.

#### Scenario: No tagline rendered after full header
- **WHEN** install runs in TTY and the full header is displayed
- **THEN** no tagline text appears between the wordmark block and the first interactive prompt

#### Scenario: No tagline rendered after light header
- **WHEN** list runs in TTY and the light header is displayed
- **THEN** no tagline text appears between the attribution line and the list output

---

## MODIFIED Requirements

### Requirement: run() constructs and dispatches a commander CLI
The library SHALL export a `run(options)` function that builds a `commander`-based CLI, registers `install`, `update`, `uninstall`, and `list` subcommands, parses `argv`, and dispatches to the appropriate handler. `argv` defaults to `process.argv` if not provided. The options object SHALL accept the following properties:

- `skillDir` (required): Path to the skill directory
- `pkg` (required): The skill's `package.json` object; `pkg.name` and `pkg.version` populate headers; `pkg.name` and `pkg.version` populate the `source` field in manifests
- `verbMode` (optional, default `'fun'`): `'fun'` for cooking verbs, `'standard'` for conventional English verbs
- `displayName` (optional): Explicit display name for headers; uppercased at render time. When omitted, the display name is derived from `pkg.name` (scope stripped, uppercased). Does not affect `pkg.name` usage in manifests, CI log prefixes, or the update notifier.
- `extendProgram` (optional): Hook called with the commander program instance after built-in commands are registered
- `transform` (optional): Hook called after normalization; return value replaces the skill object

#### Scenario: run() exits with error and prints help on unknown command
- **WHEN** `run()` is called with an unrecognised subcommand in argv
- **THEN** the full help text is printed, an error message is printed, and the process exits with a non-zero code

#### Scenario: run() requires both skillDir and pkg
- **WHEN** `run({ skillDir, pkg })` is called with both arguments present
- **THEN** `skillDir` is used as the source for all commands and `pkg.name`/`pkg.version` populate the `source` field in manifests

#### Scenario: run() throws if pkg is missing
- **WHEN** `run({ skillDir })` is called without `pkg`
- **THEN** the library throws an error at startup indicating `pkg` is required

#### Scenario: run() accepts verbMode without affecting required options
- **WHEN** `run({ skillDir, pkg, verbMode: 'standard' })` is called
- **THEN** the CLI starts normally with standard verbs; `skillDir` and `pkg` behave identically to the default call

#### Scenario: displayName overrides header display name without changing pkg behavior
- **WHEN** `run({ skillDir, pkg, displayName: 'skillet' })` is called and `pkg.name` is `'@skillet-cli/core'`
- **THEN** all headers show `SKILLET` and `pkg.name` (`@skillet-cli/core`) is still used for manifests and CI log lines
