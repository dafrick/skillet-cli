## MODIFIED Requirements

### Requirement: run() constructs and dispatches a commander CLI
The library SHALL export a `run(options)` function that builds a `commander`-based CLI, registers `install`, `update`, `uninstall`, and `list` subcommands, parses `argv`, and dispatches to the appropriate handler. `argv` defaults to `process.argv` if not provided. The options object SHALL accept the following properties:

- `pkg` (required): The skill's `package.json` object; `pkg.name` and `pkg.version` populate headers; `pkg.name` and `pkg.version` populate the `source` field in manifests. Skill location is read from the `skillet` key in `package.json` (via `skillet.skillDir` for a single skill, or `skillet.skills` for multi-skill packages). If no `skillet` key is present, `run()` throws an error at startup.
- `verbMode` (optional, default `'fun'`): `'fun'` for cooking verbs, `'standard'` for conventional English verbs
- `displayName` (optional): Explicit display name for both the full header wordmark and the light header prefix; uppercased at render time. When omitted, the display name is derived from `pkg.name` (scope stripped, uppercased). Does not affect `pkg.name` usage in manifests, CI log prefixes, or the update notifier.
- `wordmarkName` (optional): Explicit name used only for the full header wordmark (ASCII art); uppercased at render time. When provided, overrides `displayName` and the derived name for wordmark generation only — the light header still uses `displayName` or the derived name. Does not affect `pkg.name` usage in manifests, CI log prefixes, or the update notifier.
- `extendProgram` (optional): Hook called with the commander program instance after built-in commands are registered
- `transform` (optional): Hook called after normalization; return value replaces the skill object

#### Scenario: run() exits with error and prints help on unknown command
- **WHEN** `run()` is called with an unrecognised subcommand in argv
- **THEN** the full help text is printed, an error message is printed, and the process exits with a non-zero code

#### Scenario: run() reads skill location from package.json
- **WHEN** `run({ pkg })` is called and `package.json` has a `skillet` key with `skillDir` or `skills`
- **THEN** `run()` uses the path from `package.json` as the source for all commands and `pkg.name`/`pkg.version` populate the `source` field in manifests

#### Scenario: run() throws if pkg is missing
- **WHEN** `run({})` is called without `pkg`
- **THEN** the library throws an error at startup indicating `pkg` is required

#### Scenario: run() throws if no skillet key in package.json
- **WHEN** `run({ pkg })` is called and `package.json` has no `skillet` key
- **THEN** the library throws an error at startup naming `skillet.skillDir` and `skillet.skills` as the expected configuration fields

#### Scenario: run() accepts verbMode without affecting required options
- **WHEN** `run({ pkg, verbMode: 'standard' })` is called
- **THEN** the CLI starts normally with standard verbs; `pkg` behavior is identical to the default call

#### Scenario: displayName overrides header display name without changing pkg behavior
- **WHEN** `run({ pkg, displayName: 'skillet' })` is called and `pkg.name` is `'@skillet-cli/core'`
- **THEN** all headers show `SKILLET` and `pkg.name` (`@skillet-cli/core`) is still used for manifests and CI log lines

## MODIFIED Requirements

### Requirement: run() accepts verbMode and displayName options
The library SHALL accept an optional `verbMode: 'fun' | 'standard'` property and an optional `displayName: string` property in the options object passed to `run()`. When not provided, `verbMode` SHALL default to `'fun'`, preserving all existing cooking-verb behavior. When `displayName` is not provided, the display name is derived from `pkg.name` per the `skill-wordmark` derivation rules.

#### Scenario: verbMode defaults to fun when omitted
- **WHEN** `run({ pkg })` is called without a `verbMode` property
- **THEN** cooking verbs (searing, baking, reheating, etc.) are used for all command spinner and log output

#### Scenario: verbMode standard switches to conventional verbs
- **WHEN** `run({ pkg, verbMode: 'standard' })` is called
- **THEN** conventional English verb forms are used for all command spinner and log output in place of cooking verbs

#### Scenario: displayName overrides the name shown in headers
- **WHEN** `run({ pkg, displayName: 'skillet' })` is called and `pkg.name` is `'@skillet-cli/core'`
- **THEN** all headers display `SKILLET` (uppercased from `displayName`) rather than `CORE` (which would be derived from `pkg.name`)

#### Scenario: displayName does not affect pkg-sourced fields
- **WHEN** `displayName` is provided
- **THEN** `pkg.name` is still used for the CI log prefix, manifest source field, and update notifier — only the header display name changes

## MODIFIED Requirements

### Requirement: Full header uses generated wordmark from resolved display name and pkg
When the full header is displayed (install and update commands, TTY only), the library SHALL render the wordmark using the `skill-wordmark` capability. The input to wordmark generation SHALL follow this resolution order: `wordmarkName` (uppercased) when provided, otherwise `displayName` (uppercased) when provided, otherwise the name derived from `pkg.name`. No hardcoded ASCII string SHALL be used.

#### Scenario: wordmarkName overrides displayName for the wordmark only
- **WHEN** `run({ pkg, displayName: 'my-analytics-platform', wordmarkName: 'MAP' })` is called
- **THEN** the full header wordmark renders `MAP` and the light header prefix renders `MY-ANALYTICS-PLATFORM`

#### Scenario: wordmarkName does not affect light header
- **WHEN** `wordmarkName` is provided alongside `displayName`
- **THEN** the light header uses `displayName`, not `wordmarkName`

#### Scenario: wordmarkName alone (no displayName)
- **WHEN** `run({ pkg, wordmarkName: 'MAP' })` is called and `pkg.name` is `'@my-org/my-analytics-platform'`
- **THEN** the full header wordmark renders `MAP` and the light header prefix renders `MY-ANALYTICS-PLATFORM` (derived from `pkg.name`)

#### Scenario: Full header wordmark reflects pkg.name
- **WHEN** install is run with `pkg.name` set to `"my-skill"` in a TTY environment
- **THEN** the full header shows a figlet ANSI Shadow wordmark for `"MY-SKILL"` with the Ember gradient, not the SKILLET wordmark

#### Scenario: Full header is suppressed in CI as before
- **WHEN** install runs in a non-TTY environment or CI is set
- **THEN** no header is displayed, consistent with existing behavior
