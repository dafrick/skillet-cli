## Context

`create-skillet` is an interactive wizard that scaffolds skill packages for publication. Its `check` subcommand (and the post-wizard publish preview) already runs `npm pack --dry-run` and classifies tarball entries — but when violations are found, the output is passive: it prints "add these to .npmignore" and exits. The user must manually write `.npmignore`, re-run `check`, and repeat. Similarly, the wizard's scaffold preview uses technical framing ("Commands to run:"), surfaces two separate low-level plugin manifest prompts, and floods the terminal with raw npm install output.

The current tool is correct but not polished. This change makes `create-skillet` act as an active agent rather than a passive advisor.

## Goals / Non-Goals

**Goals:**
- When violations exist, let the user interactively triage them and have the CLI write `.npmignore`
- Collapse directory entries in the tarball listing by default; let users expand, include, exclude, or split directories to fine-grained file selections
- Rephrase the plugin/extension manifest opt-in as a single high-level question with conditional sub-prompts
- Change preview framing from "Commands to run:" to "Here's what I'll do:"
- Suppress raw npm install stdout; show a one-line progress indicator instead

**Non-Goals:**
- Replacing `@inquirer/prompts` with a full TUI tree widget (too heavy a dependency)
- Changing what violations are flagged (classification logic is unchanged)
- Editing `.npmignore` entries that were already written by a prior run (append-only)
- Supporting multi-level recursive expand-all in a single step

## Decisions

### Decision 1: Collapsible tree as iterative checkbox re-render

**Problem**: `@inquirer/prompts` checkbox is a flat list; there is no native tree widget.

**Chosen approach**: Multi-pass iterative rendering. Each render shows a flat checkbox list where directory entries appear as `dir/ (N files)`. After the user submits a selection:
1. Any unselected entry → added to the exclude list.
2. The user is then offered a follow-up: "Any directories to expand?" — a second checkbox showing only the *selected* directory entries.
3. Chosen directories are split one level: their direct children replace the parent entry in the next render pass.
4. Repeat until the user answers "no" to the expand prompt (or no collapsible dirs remain).
5. Write `.npmignore` with the final exclude list.

**Why not a single-pass "action per entry" approach**: Inquirer's checkbox doesn't support per-row action menus. A single pass with include/exclude/split per entry would require a full custom prompt, which is significant scope. The two-pass (select then optionally expand) pattern fits naturally into inquirer primitives.

**Alternative considered**: Present violations as a flat expanded list immediately. Rejected — violation lists can be 50+ entries (e.g., a `node_modules` subtree snuck into the tarball); collapsing makes the list scannable.

### Decision 2: .npmignore is written by the CLI, not printed

**Problem**: Current output is: "1 violation(s) found — add them to .npmignore". Users must manually copy paths.

**Chosen approach**: After the user selects entries to exclude, `check` writes (or appends to) `.npmignore` and re-runs the violation check to confirm zero violations. If `.npmignore` already exists, entries are appended; the file is not clobbered.

**Why append-only**: Authors may have manual `.npmignore` entries for other reasons; clobbering them would be destructive.

### Decision 3: Plugin/extension prompt consolidation

**Problem**: Two separate `confirm` calls ("Generate Claude Code + Copilot CLI manifests?" and "Generate Gemini CLI extension?") are low-level and independent, requiring the user to reason about which platforms they care about.

**Chosen approach**: Single high-level `confirm`: "Add plugin/extension marketplace support? (distributes your skill via Claude Code, Copilot CLI, and Gemini CLI plugin galleries)". If yes, two follow-up `confirm` prompts appear for Claude/Copilot and Gemini respectively, defaulting to `true`. If no, both are skipped.

**Why keep sub-prompts**: Authors may want one platform but not another (e.g., skip Gemini until their GitHub release workflow is set up). The high-level gate avoids confusion for authors who don't know these platforms; the sub-prompts remain for those who do.

### Decision 4: npm install output suppression

**Problem**: `npm install @skillet-cli/core` streams several screens of output during a wizard run, burying the surrounding wizard context.

**Chosen approach**: Spawn npm with `stdio: 'pipe'`. Print a single line before (`  Installing @skillet-cli/core…`) and a result line after (`  ✓ Installed @skillet-cli/core` or `  ✗ Install failed` with stderr shown on failure). On failure, surface the full captured stderr so the author can diagnose.

**Why not suppress on failure**: Silent failures are worse than noisy ones. The captured stderr is emitted on non-zero exit.

### Decision 5: "Here's what I'll do:" framing

Simple text substitution in `run.ts`. The preview block currently says "Commands to run:\n  npm init...\n  npm pkg set..." — this is changed to "Here's what I'll do:\n  Initialize package.json\n  Set package fields…" using human-readable descriptions instead of raw shell commands.

## Risks / Trade-offs

- **Iterative expand UX complexity**: The two-pass (select → expand) pattern requires authors to think in two steps. Mitigated by clear prompt phrasing ("Any directories you want to inspect further?") and defaulting all entries to *included* (no accidental excludes).
- **`.npmignore` append on re-run**: If an author runs `check` twice, they could accumulate duplicate entries. Mitigated by deduplicating entries before writing.
- **npm pipe on slow connections**: Piping npm suppresses live progress. If `npm install` hangs (e.g., registry timeout), the author sees no feedback. Mitigated by showing a spinner during the install.
- **Inquirer version constraints**: Prompt chaining (show expand prompt only if collapsible dirs exist) is straightforward in `@inquirer/prompts` v3+ but must be verified against the pinned version in the repo.
