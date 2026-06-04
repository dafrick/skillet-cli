## Context

`packages/core` is the only published package today. It ships as `@skillet-cli/core` and provides the `run()` function that all Skillet-powered skill packages use as their runtime. Its `src/ui/` directory contains brand color tokens, a spinner, figlet wordmark rendering, and header factories — all currently private to `packages/core`.

There is no tooling to help skill authors package their skills. The expected workflow (read the README, run `npm init`, manually edit `package.json`, write `bin/cli.js` from scratch) is error-prone and assumes npm packaging familiarity most skill authors don't have.

Two new packages are introduced:
- `packages/ui` (`@skillet-cli/ui`, private) — extracts the shared visual layer so `create` and `core` stay visually consistent without code duplication
- `packages/create` (`create-skillet`, published) — the interactive wizard

## Goals / Non-Goals

**Goals:**
- Ship `create-skillet` as an independently installable CLI (`npm create skillet`)
- Use only native npm commands to set up `package.json` — no manual JSON writes
- Derive sensible defaults from the local environment (git remote, git config)
- Handle the `SKILL.md`-in-root edge case gracefully with a bounded file selection UX
- Share brand-level UI (colors, spinner, wordmark) between `core` and `create` via `@skillet-cli/ui`
- Ship before the `add-skilletizer-skill` change (the AI-guided path will reference this tool)

**Non-Goals:**
- Publishing to npm from within the wizard (future scope — print instructions only)
- Setting up GitHub Actions CI/CD from within the wizard (future scope)
- Supporting non-npm package managers in the wizard (pnpm/yarn left for later)
- Migrating existing, partially-configured Skillet packages (wizard targets fresh setup only)
- Extracting `verbs.ts` or `taglines.ts` to `@skillet-cli/ui` — these are core-specific and intentionally stay local

## Decisions

### Decision: `@skillet-cli/ui` as a private workspace package

Sharing UI code via a private workspace package (`workspace:*` dependency) keeps `core` and `create` visually identical without publishing an additional package or copy-pasting modules. pnpm workspace resolution handles the local link; consumers see no difference from a published package at dev time.

Alternative: Copy `src/ui/` into `packages/create`. Rejected — color tokens and spinner logic will diverge over time and create visual inconsistency.

Alternative: Publish `@skillet-cli/ui` to npm. Rejected — it's internal plumbing with no value to external consumers. Private keeps the surface area small.

### Decision: `npm init -y` then `npm pkg set`, not manual JSON writes

`npm pkg set` is idempotent, composable, and supports nested keys (`repository.type`, `repository.url`). It also handles escaping and type coercion. Manual `JSON.parse` / `JSON.stringify` loses comments, changes key ordering, and is fragile.

`npm init -y` seeds reasonable defaults (name from directory, node engines entry) so we start from a valid `package.json` even when one doesn't exist. The wizard then overrides every field it collected via `npm pkg set`.

Alternative: Write `package.json` directly using `fs.writeFile`. Rejected — brittle, order-sensitive, and bypasses npm's own validation.

### Decision: Git remote and config as default sources

`git remote get-url origin` gives the repository URL (normalized to `git+https://` format for npm). `git config user.name` and `git config user.email` give the author. Both are run silently during detection; failures are swallowed and the relevant fields are left empty for the user to fill in.

This avoids prompting for information the environment already has, while still letting users override anything.

### Decision: File selection UX for SKILL.md-in-root scenario

When `SKILL.md` is in the directory root (not in `skill/`), the wizard must offer to move it. Two modes:

- **≤12 items in directory**: `checkbox` prompt with all visible items. Pre-selected: `SKILL.md` (always) and any folder matching `resources`, `assets`, or `templates`. Not pre-selected: `README.md`, `.gitignore`, lock files, dot-folders.
- **>12 items**: Single `confirm` prompt — move `SKILL.md` + `resources/` only; everything else is the author's responsibility.

The threshold of 12 is chosen to keep the checkbox list usable without scrolling in a standard 24-line terminal. This is a hardcoded constant, not configurable.

### Decision: Wordmark text is "SKILLETIZE"

The `create` tool's figlet header renders "SKILLETIZE" (not "SKILLET" or "CREATE"). This matches the verb that describes what the tool does and ties it to the skilletize concept established elsewhere in the project. The subtitle line is dynamic: `Package <name> for any AI agent` (using the detected or entered package name once known, falling back to `your skill` before detection).

### Decision: Cross-promotion is a one-time TTY hint in `packages/core`

After a successful `install` command (TTY only), `core` checks whether `create-skillet` is available via `npm list -g create-skillet --json` (or absence of the binary). If not found, it prints a single-line tip: `Tip: publish your own skill — npm create skillet`. This is suppressed in CI and non-TTY environments. It is shown at most once per session (not persisted across sessions — keeping it simple).

Alternative: Use `update-notifier`-style persistence. Rejected — overkill for a single-line tip; we don't want to write config files for this.

### Decision: Taglines stay in `packages/core`

The cooking tagline pool is part of core's personality, not shared brand infrastructure. `create-skillet` has a fixed tagline (`Package your skill for any AI agent`) rather than a random one, matching the wizard's focused, single-purpose nature.

### Decision: TypeScript, same toolchain as `packages/core`

Both new packages use TypeScript with ESM output, `tsc` for build, `vitest` for tests, `biome` for lint/format. The build step is our concern — users run the compiled output from npm, not source. Keeping the toolchain identical lowers maintenance overhead and means contributors don't context-switch.

## Risks / Trade-offs

[`@skillet-cli/ui` migration breaks `packages/core` imports] → Mitigation: do the migration in a single atomic commit; CI catches any missed import paths immediately.

[`npm pkg set` requires npm ≥7] → `engines.node: ">=24"` implies a modern npm; no real risk. Document in README.

[File move in SKILL.md-in-root scenario is destructive] → Mitigation: print exactly which files were moved; the early gate confirm step makes the user aware changes are coming before anything happens.

[`git remote get-url origin` fails on non-git directories] → Swallow the error; leave the repository URL field empty for manual entry.

[Cross-promotion hint creates noise] → Kept to a single dim line after the install summary; not shown in CI or non-TTY.

## Migration Plan

1. Create `packages/ui` and move UI modules from `packages/core/src/ui/` — update all import paths in `packages/core`
2. Add `@skillet-cli/ui` as a `workspace:*` dependency in `packages/core/package.json`
3. Create `packages/create` with full wizard implementation
4. Add cross-promotion hint to `packages/core/src/run.ts`
5. Update root Makefile and CI matrix to include both new packages
6. Publish `packages/ui` is skipped (private); publish `packages/create` as `create-skillet`

Rollback: `packages/ui` extraction is the only change to existing code. If it causes regressions, reverting means copying the modules back into `packages/core/src/ui/` and removing the workspace dependency — a mechanical inversion with no data migration.
