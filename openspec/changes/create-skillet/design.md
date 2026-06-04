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

### Decision: `@skillet-cli/ui` bundled at build time, not a published runtime dependency

`@skillet-cli/ui` is `private: true` and is never published to npm. Consuming packages (`packages/core` and `packages/create`) use tsup with `noExternal: ['@skillet-cli/ui']` to bundle the UI code into their own `dist/` at build time. The published tarballs ship with the UI code inlined — `@skillet-cli/ui` does not appear in their published `package.json` dependencies and is never fetched from the registry by consumers.

`@skillet-cli/ui` is listed as a `devDependency` (not `dependency`) in consuming packages, making the build-time-only relationship explicit.

Alternative: Copy `src/ui/` into `packages/create`. Rejected — color tokens and spinner logic will diverge over time and create visual inconsistency.

Alternative: Publish `@skillet-cli/ui` to npm. Rejected — it's internal plumbing with no value to external consumers. Private keeps the surface area small.

Alternative: List as a runtime `workspace:*` dependency without bundling. Rejected — pnpm rewrites `workspace:*` to the resolved version number at publish time, producing a `package.json` that references a package that doesn't exist on the registry; consumer installs would fail.

### Decision: `npm init -y` then `npm pkg set`, not manual JSON writes

`npm pkg set` is idempotent, composable, and supports nested keys (`repository.type`, `repository.url`). It also handles escaping and type coercion. Manual `JSON.parse` / `JSON.stringify` loses comments, changes key ordering, and is fragile.

`npm init -y` seeds a minimal `package.json` (name from directory, version: 1.0.0) when one doesn't exist. It does NOT set an `engines` field. The wizard explicitly sets every required field via `npm pkg set`, including `engines.node='>=24'`.

Alternative: Write `package.json` directly using `fs.writeFile`. Rejected — brittle, order-sensitive, and bypasses npm's own validation.

### Decision: Wizard runs in two phases — NPM setup first, then skilletize

The wizard separates concerns into two independent phases, each with its own preview and confirmation gate:

**Phase 1 — NPM setup** (reversible):
1. Configuration prompts (name, version, description, author, repo URL, license, skill content path)
2. NPM preview: summary of what `npm init`, `npm pkg set`, `bin/cli.js`, and `npm install` will do → confirm or exit cleanly with no changes made
3. Execution: run npm commands and write `bin/cli.js`

**Phase 2 — Skilletize** (destructive file moves):
1. File selection prompts (checkbox ≤12 items, confirm >12 items) — only shown when `SKILL.md` is in root and `skill/` doesn't exist
2. Skilletize preview: list which files will be moved → confirm or exit with "No files moved. Your npm package is set up."
3. Execution: move selected files into `skill/`

Rationale: if `package.json` is already configured, the user can run `create-skillet` just to skilletize. File moves are harder to undo than npm package setup, so they run last with their own gate immediately before execution. Each phase's decline exits cleanly with only that phase's changes undone.

Alternative: File moves first, then npm setup (original design). Rejected — the "filesystem untouched" promise on preview-decline was broken because file moves had already occurred before the single preview step.

### Decision: `skillet.skillDir` field in `package.json` for skill content path

The skill content path (e.g., `skill/`) is stored as a namespaced `skillet.skillDir` key in `package.json` rather than in `repository.directory`. This follows the pattern used by tools like Prettier (`"prettier"`), semantic-release (`"release"`), and others that write tool-specific config into `package.json`.

`repository.directory` is an npm registry convention for monorepo sub-packages — it tells the registry "within the git repo at `repository.url`, this package lives at this subdirectory." A standalone skill package is not a monorepo sub-package, so using `repository.directory` for a runtime content path would be semantically wrong and mislead npm tooling.

`skillet.skillDir` is written via `npm pkg set skillet.skillDir=skill/` and is read back by the wizard on re-run to populate the skill content path prompt default — eliminating the need for a separate settings file.

### Decision: Early gate surfaces detection context

The early gate confirmation includes a summary of what was detected in the current directory, alongside the absolute current working directory path. Showing detected context (SKILL.md found/not found, existing package.json, detected git user) lets the user verify they are in the right directory and that defaults look correct before committing. A user who accidentally runs the wizard in their home folder will see the cwd and absence of SKILL.md and catch the mistake before confirming.

### Decision: Git remote and config as default sources

`git remote get-url origin` gives the repository URL (normalized to `git+https://` format for npm). `git config user.name` and `git config user.email` give the author. Both are run silently during detection; failures are swallowed and the relevant fields are left empty for the user to fill in.

This avoids prompting for information the environment already has, while still letting users override anything.

### Decision: File selection UX for SKILL.md-in-root scenario

When `SKILL.md` is in the directory root (not in `skill/`), the wizard must offer to move it. Two modes:

- **≤12 items in directory**: `checkbox` prompt with all visible items. Pre-selected: `SKILL.md` (always) and any folder matching `resources`, `assets`, or `templates`. Not pre-selected: `README.md`, `.gitignore`, lock files, dot-folders.
- **>12 items**: Single `confirm` prompt — move `SKILL.md` + `resources/` only. The prompt explicitly names any other skill-related directories found but not offered (e.g., `assets/`, `templates/`) so the user knows to move them manually.

The threshold of 12 is chosen to keep the checkbox list usable without scrolling in a standard 24-line terminal. This is a hardcoded constant, not configurable.

### Decision: Wordmark text is "SKILLETIZE"

The `create` tool's figlet header renders "SKILLETIZE" (not "SKILLET" or "CREATE"). This matches the verb that describes what the tool does and ties it to the skilletize concept established elsewhere in the project. The subtitle line is dynamic: `Package <name> for any AI agent` (using the detected or entered package name once known, falling back to `Package your skill for any AI agent` before detection).

### Decision: Cross-promotion is a one-time TTY hint in `packages/core`

After a successful `install` command (TTY only), `core` checks whether `create-skillet` is available via `which create-skillet`. If the command returns non-zero, it prints a single-line tip: `Tip: publish your own skill — npm create skillet`. This is suppressed in CI and non-TTY environments. It is shown at most once per session (once per process invocation — not persisted across sessions).

`which create-skillet` is preferred over `npm list -g create-skillet --json` because `npm list -g` scans the entire global node_modules tree and can take 500ms–2s, adding visible latency to every successful install. `which create-skillet` is instantaneous. The acceptable trade-off is false-negatives when the binary exists but isn't on PATH (e.g., some Volta setups); this is fine for an optional hint.

Alternative: Use `update-notifier`-style persistence. Rejected — overkill for a single-line tip; we don't want to write config files for this.

### Decision: Taglines stay in `packages/core`

The cooking tagline pool is part of core's personality, not shared brand infrastructure. `create-skillet` uses a dynamic tagline — `Package <name> for any AI agent` — rather than a rotating random one, matching the wizard's focused, single-purpose nature. The tagline interpolates the detected or entered package name once known, falling back to `Package your skill for any AI agent` before detection.

### Decision: TypeScript, same toolchain as `packages/core` — tsup for build

`packages/ui` uses `tsc` for build (it is compiled but not bundled). `packages/core` and `packages/create` use `tsup` for build — tsup bundles `@skillet-cli/ui` via `noExternal: ['@skillet-cli/ui']` into their dist output. All packages use `tsc` for typecheck, `vitest` for tests, `biome` for lint/format.

Keeping the toolchain otherwise identical lowers maintenance overhead and means contributors don't context-switch. tsup is built on esbuild and produces builds in <100ms — no meaningful DX regression from the `tsc`-only baseline. `packages/ui/package.json` must declare `"exports": { ".": "./dist/index.js" }` and `"main": "./dist/index.js"` so that tsup can resolve it when bundling with `noExternal: ['@skillet-cli/ui']`. Without this, tsup falls back to heuristics and may resolve the wrong entry on a clean checkout.

## Risks / Trade-offs

[`@skillet-cli/ui` migration breaks `packages/core` imports] → Mitigation: do the migration in a single atomic commit; CI catches any missed import paths immediately.

[`npm pkg set` requires npm ≥7] → `engines.node: ">=24"` implies a modern npm; no real risk. Document in README.

[File move in SKILL.md-in-root scenario is destructive] → Mitigation: file moves run in Phase 2 with their own preview/confirm gate immediately before execution; the NPM phase preview does not cover file moves.

[`git remote get-url origin` fails on non-git directories] → Swallow the error; leave the repository URL field empty for manual entry.

[Cross-promotion hint creates noise] → Kept to a single dim line after the install summary; not shown in CI or non-TTY.

[`which create-skillet` false-negative in some PATH configurations] → Acceptable for an optional hint; the tip fires only when `which` returns non-zero.

## Migration Plan

1. Create `packages/ui` and move UI modules from `packages/core/src/ui/` — update all import paths in `packages/core`
2. Add `@skillet-cli/ui` as a `devDependency` (`workspace:*`) in `packages/core/package.json`; add `tsup.config.ts` with `noExternal: ['@skillet-cli/ui']`
3. Create `packages/create` with full wizard implementation and `tsup.config.ts`
4. Add cross-promotion hint to `packages/core/src/run.ts`
5. Update root Makefile and CI matrix to include both new packages
6. Publish `packages/ui` is skipped (private); publish `packages/create` as `create-skillet`

Rollback: `packages/ui` extraction is the only change to existing code. If it causes regressions, reverting means copying the modules back into `packages/core/src/ui/` and removing the workspace dependency — a mechanical inversion with no data migration.
