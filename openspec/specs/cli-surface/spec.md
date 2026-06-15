## ADDED Requirements

### Requirement: run() constructs and dispatches a commander CLI
The library SHALL export a `run(options)` function that builds a `commander`-based CLI, registers `install`, `update`, `uninstall`, and `list` subcommands, parses `argv`, and dispatches to the appropriate handler. `argv` defaults to `process.argv` if not provided.

#### Scenario: run() exits with error and prints help on unknown command
- **WHEN** `run()` is called with an unrecognised subcommand in argv
- **THEN** the full help text is printed, an error message is printed, and the process exits with a non-zero code

#### Scenario: run() reads skill location from package.json
- **WHEN** `run({ pkg })` is called and `package.json` has a `skillet` key with `skillDir` or `skills`
- **THEN** `run()` uses the path from `package.json` as the source for all commands and `pkg.name`/`pkg.version` populate the `source` field in manifests

#### Scenario: run() throws if pkg is missing
- **WHEN** `run({})` is called without `pkg`
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

---

## CLI Design System

All visual decisions are canonically demonstrated in `docs/design/cli-design-system.html`, which includes the interactive step-through of every flow, the SKILLET wordmark with copyable ANSI escape sequence, color swatches, the cooking verb reference table, and the full tagline pool.

### Color System — Ember & Iris

Named after its two accent families.

#### Color tokens

| Role | Name | Hex | chalk mapping |
|---|---|---|---|
| Primary brand | Ember 500 | `#E8743B` | `chalk.rgb(232,116,59)` |
| Primary deep | Ember Char | `#9C441C` | `chalk.rgb(156,68,28)` |
| Interactive / prompts | Iris Bright | `#A78BFA` | `chalk.rgb(167,139,250)` |
| Interactive deep | Iris | `#7C3AED` | `chalk.rgb(124,58,237)` |
| Success | Basil | `#2FB67C` | `chalk.rgb(47,182,124)` |
| Error | Chili | `#E5484D` | `chalk.rgb(229,72,77)` |
| Warning | Ember 400 | `#F0925A` | `chalk.rgb(240,146,90)` |
| Dim / secondary | — | `#A3917F` | `chalk.dim` |

#### Usage rules

- **Ember** — wordmark gradient, spinner character (`⠙`), `⚠` warnings
- **Iris Bright** — prompt prefix `?`, cursor `›`, highlighted choice in multi-select, confirmed selection summary, keyboard hint text (`↑↓`, `Space`, `Enter`)
- **Iris deep** — selected chip badge background
- **Basil** — `✔` success prefix, `pristine` drift status
- **Chili** — `✘` error prefix, `modified` drift status
- **Dim** — paths, hashes, secondary descriptors, taglines

#### Wordmark gradient

Six-line ANSI-shadow block art rendered with a five-stop heated-iron gradient applied row-by-row:

```
#FBD2A0 → #F0925A → #E8743B → #C75A28 → #9C441C
```

Shadow characters (`╗`, `╔`, `═`, `╝`, `╚`) are rendered at 40% brightness of the row color. Full ANSI escape sequence is exportable from the design system HTML.

---

### Header System

Both variants are **suppressed entirely** when `process.stdout.isTTY` is falsy or the `CI` environment variable is set. `NO_COLOR` suppresses color but not structure.

#### Full header — `install` and `update` only

```
███████╗██╗  ██╗██╗██╗     ██╗     ███████╗████████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝╚══██╔══╝
███████╗█████╔╝ ██║██║     ██║     █████╗     ██║
╚════██║██╔═██╗ ██║██║     ██║     ██╔══╝     ██║
███████║██║  ██╗██║███████╗███████╗███████╗   ██║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝

  <rotating tagline>
```

Wordmark rendered with the heated-iron gradient. One tagline selected at random from the 20-item pool on each invocation.

#### Light header — `list` and `uninstall`

```
SKILLET v0.1.0  ·  Install agent skills across your AI tools
  <rotating tagline>
```

`SKILLET` rendered in Ember 500 bold, all caps. Version and blurb in `chalk.dim`. One tagline from the same pool.

---

### Rotating Tagline Pool

One entry selected at random per invocation. The same pool is used for both header variants.

```
"Mise en place for your agents."
"Cast iron. No flaking."
"Skills so hot they need an oven mitt."
"Season your agents. Properly."
"From raw to production heat."
"Hot skills. Zero compromise."
"Your skills, served fresh."
"Low and slow wins the deploy."
"Don't ship cold skills."
"Heat-treated. Battle-hardened."
"Sharp knife. Sharper agents."
"Your agent stack, properly seasoned."
"Well done. (Not the steak.)"
"No raw skills in production."
"Skills that don't stick."
"The secret ingredient is version control."
"Rendered fat-free, feature-rich."
"Fresh install, every time."
"Properly plated. Ready to serve."
"First rule: mise en place."
```

---

### Cooking Verb Pools

One verb selected at random per invocation within each command's pool. The active (spinner) and done (`✔`) forms are always used as a matched pair. Verb copy is sentence-case in interactive TTY mode and lowercase in CI / non-TTY mode.

#### install

| Active | Done |
|---|---|
| Searing into `<target>`… | ✔ Seared |
| Baking into `<target>`… | ✔ Baked |
| Frying into `<target>`… | ✔ Fried |
| Grilling into `<target>`… | ✔ Grilled |
| Roasting into `<target>`… | ✔ Roasted |

#### update

| Active | Done |
|---|---|
| Reheating `<target>`… | ✔ Reheated |
| Seasoning `<target>`… | ✔ Seasoned |
| Basting `<target>`… | ✔ Basted |
| Sautéing `<target>`… | ✔ Sautéed |
| Tempering `<target>`… | ✔ Tempered |

#### uninstall

| Active | Done |
|---|---|
| Scraping `<target>`… | ✔ Scraped |
| Clearing `<target>`… | ✔ Cleared |
| Scrubbing `<target>`… | ✔ Scrubbed |
| Scouring `<target>`… | ✔ Scoured |
| Degreasing `<target>`… | ✔ Degreased |

#### detect (target detection on startup)

| Active | Done |
|---|---|
| Scoping the kitchen… | ✔ Found N targets |
| Checking the pantry… | ✔ Found N target(s) |
| Lighting the stove… | ✔ Found N targets |
| Surveying the mise en place… | ✔ Found N targets |
| Preheating the oven… | ✔ Found N targets |

---

### Install Interaction Flow

#### Interactive (TTY)

**Step 1 — Scope** (single-select). Skipped automatically if `--scope` is passed or the selected target supports only one scope.

```
? Which scope?

›  ●  user      — installs to your home directory
   ○  project   — installs to this repository
```

Collapses to `✔ Which scope? user` on confirm.

**Step 2 — Targets** (searchable multi-select). Pre-selects all detected targets. Skipped if `--target` flags are passed.

```
? Which targets?
  Selected: [claude] [copilot]
  Search: [type to filter]
  ↑↓ navigate · Space toggle · Enter confirm

›  ◉  claude    (detected)
   ◉  copilot   (detected)
   ○  agents
```

Collapses to `✔ Which targets? claude, copilot` on confirm.

**Per-target install** — one spinner line per target, replaced by a `✔` line on completion:

```
⠙ Searing skills into claude…
✔ Seared    claude   ~/.claude/skills/my-skill/
⠙ Baking skills into copilot…
✔ Baked     copilot  .github/skills/my-skill/

  2 targets installed · 0.4s
```

#### Non-interactive (no TTY / CI)

No header, no prompts, no spinner. All detected targets are used. Prefixed log lines only:

```
[my-skill] searing skills into claude (user)…
[my-skill] ✔ seared — ~/.claude/skills/my-skill/
[my-skill] 1 target installed
```

Prefix is `pkg.name` from the author's package. Verb copy is lowercase.

#### Flag behaviour summary

| Flag | Behaviour |
|---|---|
| `--scope user\|project` | Skips scope prompt; errors if target doesn't support the requested scope |
| `--target <id>` | Skips target prompt; repeatable |
| `--yes` | Skips scope and target selection prompts; selects all detected targets |
| `--force` | Overwrites drifted installs without the three-way drift prompt |

`--yes` and `--force` are orthogonal: `--yes` suppresses selection prompts, `--force` suppresses drift prompts.

---

### Update Interaction Flow

#### No drift

```
⠙ Reheating claude…
✔ Reheated  claude   ~/.claude/skills/my-skill/
```

#### Drift detected — three-way prompt per drifted install

```
⚠  claude has local modifications

   What would you like to do?
›  ○  backup and overwrite   — saves a timestamped copy, then reinstalls
   ○  overwrite              — discards local changes and reinstalls
   ○  skip                   — leave this install as-is
```

Backup naming: `<skill-name>.bak.<ISO8601Z>/` as a sibling directory (e.g. `my-skill.bak.20260530T120000Z/`).

#### Nothing to update

```
  All installs are up to date.
```

---

### List Output

Light header, then a fixed-width table. No prompts.

```
SKILLET v0.1.0  ·  Install agent skills across your AI tools
  Cast iron. No flaking.

  claude    ~/.claude/skills/my-skill/    pristine   sha256:a1b2c3…
  copilot   .github/skills/my-skill/    pristine   sha256:a1b2c3…
  agents    ~/.agents/skills/my-skill/   modified   sha256:f9e8d7…
```

- `pristine` — Basil green
- `modified` — Chili red
- `unknown` — dim
- `· stale` — appended in dim when source hash differs from manifest hash

Nothing installed → `  No installs found.`

---

### Uninstall Interaction Flow

Light header. Multi-select with all detected installs pre-selected.

```
? Which installs would you like to remove?
  Selected: [claude] [copilot] [agents]
  ↑↓ navigate · Space toggle · Enter confirm

›  ◉  claude    ~/.claude/skills/my-skill/
   ◉  copilot   .github/skills/my-skill/
   ◉  agents    ~/.agents/skills/my-skill/
```

Per-target with a cleaning verb from the uninstall pool:

```
⠙ Scrubbing claude…
✔ Scrubbed  claude
⠙ Scouring  copilot…
✔ Scoured   copilot

  2 installs removed · 0.1s
```

`--yes` skips the prompt and removes all. Nothing found → `  No installs found.`

---

### Error & Warning Patterns

#### Errors — Chili red, `✘` prefix, exit non-zero

```
✘ unsupported scope — copilot does not support user scope
✘ pkg is required — pass { pkg } to run()
✘ unknown command: "deploy" — run my-skill --help for usage
```

No stack traces to stdout. Set `DEBUG=1` to surface them to stderr.

#### Warnings — Ember 400, `⚠` prefix, non-fatal

```
⚠  claude has local modifications (use --force to overwrite)
```

#### Update notifier

Appears after all command output, TTY only, when a newer npm version is available:

```
  Update available  0.1.0 → 0.2.0
  Run npm update my-skill then my-skill update
```

## ADDED Requirements

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

The attribution line format: `Packaged with Skillet v{core-version}` in Iris Bright bold, followed by `· package your own for any agent in one step ↗` in `chalk.dim`, where `↗` is an OSC 8 terminal hyperlink to `https://github.com/dafrick/skillet-cli` and `{core-version}` is `@skillet-cli/core`'s own package version.

#### Scenario: Attribution line appears below full header wordmark
- **WHEN** install runs in TTY and the full header is displayed
- **THEN** the line immediately following the wordmark block reads the attribution string in Iris Bright + dim

#### Scenario: Attribution line appears below light header name line
- **WHEN** list runs in TTY and the light header is displayed
- **THEN** the line immediately following the name line reads the attribution string

#### Scenario: Attribution line is suppressed in CI/non-TTY
- **WHEN** install runs in a non-TTY environment or CI is set
- **THEN** no attribution line is emitted

#### Scenario: Attribution hyperlink points to skillet-cli repo
- **WHEN** a TTY header is rendered
- **THEN** the OSC 8 hyperlink URL in the attribution line is `https://github.com/dafrick/skillet-cli`

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

- `pkg` (required): The skill's `package.json` object; `pkg.name` and `pkg.version` populate headers; `pkg.name` and `pkg.version` populate the `source` field in manifests. Skill location is read from the `skillet` key in `package.json` (`skillet.skillDir` for a single skill, or `skillet.skills` for multi-skill packages). If no `skillet` key is present, `run()` throws an error at startup.
- `verbMode` (optional, default `'fun'`): `'fun'` for cooking verbs, `'standard'` for conventional English verbs
- `displayName` (optional): Explicit display name for both the full header wordmark and the light header prefix; uppercased at render time. When omitted, the display name is derived from `pkg.name` (scope stripped, uppercased). Does not affect `pkg.name` usage in manifests, CI log prefixes, or the update notifier.
- `wordmarkName` (optional): Explicit name used only for the full header wordmark (ASCII art); uppercased at render time. When provided, overrides `displayName` and the derived name for wordmark generation only — the light header still uses `displayName` or the derived name. Useful when `displayName` is long enough to overflow the terminal in figlet output. Does not affect `pkg.name` usage in manifests, CI log prefixes, or the update notifier.
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
