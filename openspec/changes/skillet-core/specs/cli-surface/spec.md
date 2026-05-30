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

Both variants are **suppressed entirely** when `process.stdin.isTTY` is falsy or the `CI` environment variable is set. `NO_COLOR` suppresses color but not structure.

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
✔ Baked     copilot  .github/copilot/my-skill/

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
  copilot   .github/copilot/my-skill/    pristine   sha256:a1b2c3…
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
   ◉  copilot   .github/copilot/my-skill/
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
