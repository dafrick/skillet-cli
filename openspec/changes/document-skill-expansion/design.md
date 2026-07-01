## Context

`packages/create/src/run.ts` implements the bare `create-skillet` command as a single Commander `.action()`: `detectEnvironment()` → early-gate confirm → `collectConfig()` (the full wizard, `prompts.ts`) → "Ready to set up" preview + confirm → `executeScaffold()` → `setupSkillDir()` (skipped for multi-skill) → `runCheck({interactive:false})` → completion block. `hasPackageJson: true` today changes none of this — a re-run against an already-published skillet package asks the identical questions and rewrites the identical files as a first run.

Concretely, `executeScaffold()` (`scaffold.ts`) runs `npm init -y` only if no `package.json` exists, but unconditionally: (a) writes `bin/cli.js`, (b) writes `.npmignore` with a fixed one-line body, and (c) runs a single `npm pkg set` writing `name`, `version`, `description`, `author`, `license`, `type`, `engines.node`, `skillet.skillDir`/`skillet.skills`, `bin.<name>`, `files[]`, and scripts — all derived fresh from whatever `collectConfig()` just collected, with no comparison to what's already on disk. The `files[]` array is already computed dynamically (`files[0]=bin`, `files[1..n]` from skill dir(s)) rather than hardcoded, but nothing surfaces that computation to a user who just wants to add one more directory.

`detect.ts` already reads `package.json` and feeds detected values back into `prompts.ts` as defaults (this is why hitting Enter through the whole wizard today happens to preserve most metadata), and an existing precedent (`license-default-preserve-existing`, archived 2026-06-15) established the "detect existing value → use as default" pattern for `license`. But defaults-only doesn't help when a user changes one field while blindly accepting stale defaults elsewhere, or when the user's intent was never "reconfigure metadata" in the first place — it was "add a directory."

`skill-dir.ts`'s `setupSkillDir()` already has a working idempotent-re-run guard (skip with a message if `skill/` already exists) — the closest existing precedent for "detect state, don't redo work unconditionally," and the pattern the new logic follows rather than inventing something new.

Three prior PRs (#117, #120, #122) attempted to close this gap by printing instructions (an "expand your skill" doc block, README section) instead of building the automation, and were rejected each time as exactly the anti-pattern `docs/ux-principles.md` warns against. This design is deliberately structural, not cosmetic, relative to those attempts.

## Goals / Non-Goals

**Goals:**
- Detect, on the bare `create-skillet` re-run, that the current directory is already a scaffolded skillet package.
- Offer narrow, non-destructive flows for the two common expansion cases (add a directory to `files[]`; add another skill / convert to multi-skill) that never touch published metadata fields and never expose an internal detail like an array index to the user.
- Require an explicit, computed plan + single confirmation before any write, for every branch (new or existing).
- Add real diff+consent before `package.json` metadata (`name`/`version`/`description`/`author`/`license`) is overwritten via the full-reconfigure path.
- Stop silently clobbering author-owned generated files (`.npmignore` now; `bin/cli.js` as a judgment-call extension of the same principle) on any re-run.
- Keep all of this inside the existing bare `create-skillet` command — no new subcommand or flag.

**Non-Goals:**
- No new `--update` flag or `skillet update` subcommand (maintainer explicitly ruled this out; the runtime `update` command for *installed* skills is an unrelated, already-shipped capability).
- No non-interactive/CI/scripted mode (`--yes`, flag-driven skip) for the new menu — out of scope, and the existing mocked-`@inquirer/prompts` unit-test pattern is sufficient without it.
- No changes to `@skillet-cli/core` (the end-user install/update runtime) — this is entirely inside the author-facing `create-skillet` package.
- No SPDX validation/normalization for `license` — treated as an opaque string in the new diff, consistent with the prior `license-default-preserve-existing` change.

## Decisions

### 1. Branch the existing bare command via an intent menu, not a new command
`detectEnvironment()` gains `isExistingSkilletPackage: boolean` (true when `hasPackageJson && (pkg.skillet?.skillDir || pkg.skillet?.skills)` is present) and a captured `files: string[]` (current `package.json` files array). When true, `run.ts`'s action replaces the immediate call into `collectConfig()` with an `@inquirer/prompts` `select()` menu:
- Add a directory to the published package
- Add another skill / convert to multi-skill
- Reconfigure everything (name, version, description, author, license, layout)
- Just check what would be published (delegates to the existing `create-skillet check` / `runCheck`)

`run.test.ts` already stubs `select` in its mock setup even though no source file currently calls it — this menu is what that stub is for, so no new mock plumbing is needed.

*Alternative considered:* a new `skillet update`/`--expand` surface. Rejected — the maintainer explicitly directed that the fix live in the bare re-run, and a second command re-introduces the "requiring multiple sequential commands for one logical operation" failure mode named in `docs/ux-principles.md`.

### 2. The two new quick flows never touch metadata fields, by construction
"Add a directory" and "Add another skill" are implemented as narrow flows that only ever read the current `files[]`/`skillet.skills` and write an addition to them (via targeted `npm pkg set` calls or an equivalent scoped write), then continue straight to `bin/cli.js`/`.npmignore` guards and the check pass. They do not call `collectConfig()` at all. This is the primary mitigation for Gap 4 on these paths — there is no metadata to diff because none is collected.

*Alternative considered:* running the two quick flows through `collectConfig()` with most fields pre-filled and skipped. Rejected — even skip-if-unchanged logic on a full wizard is a more complex, more error-prone surface than simply never invoking the metadata-collecting prompts for a flow that has no reason to touch them.

### 3. Compute file-array/menu positions programmatically; never print an index to the user
The issue body's literal prescription ("new directories go at `files[2]`") is stale for current code (the index depends on how many skill dirs already exist) and, more importantly, is exactly the anti-pattern named in `docs/ux-principles.md` Principle 2. The "add a directory" flow computes the insertion via `files.length` (append) and calls `npm pkg set` with the resulting concrete arg — the user only ever sees the resulting plan ("Will add `prompts/` to the published package"), never an index.

### 4. Explicit plan step reuses the existing "Ready to set up" pattern
`run.ts` already implements a plan-then-confirm UI for first-run scaffolding (`Ready to set up:` values block + `Here's what I'll do:` action list + single confirm, lines 128–155). Every new branch that writes anything (quick-add-directory, quick-add-skill, and the metadata diff on reconfigure) extends this same rendering rather than inventing a new UI convention — e.g., "Will convert to multi-skill: `skills/brainstorming/`, `skills/debugging/`" followed by the same single-confirm pattern.

### 5. Metadata diff+consent is scoped to the reconfigure path only
After `collectConfig()` returns (reconfigure path only), diff `config.{name,version,description,author,license}` against `detected.{...}` (already available from `detectEnvironment()`). If any differ, print a "Changes to published metadata:" block showing `current → new` per changed field, folded into (or immediately preceding) the existing preview-confirm step. `license` is included for uniformity even though the maintainer's original ask named only four fields — keeping the diff field-agnostic (iterate over a fixed list of comparable keys) is simpler than special-casing four of five metadata fields.

*Alternative considered:* diffing unconditionally on every run regardless of entry path. Rejected as redundant — the quick paths structurally cannot produce a metadata diff (Decision 2), so gating the diff logic to the reconfigure path avoids dead code paths and keeps the diff's "current" values sourced from the same `detected` object already in scope there.

### 6. Generalize the "detect modification, don't silently clobber" guard to `bin/cli.js`
`.npmignore`'s fix (Gap 1) is a simple existence guard: don't write it if it already exists. `bin/cli.js` gets a slightly stronger version — compare existing on-disk content against a freshly rendered version (extracted into a small `buildBinCliJs()`-style helper reusable by both the writer and the guard); if they differ, warn and ask for consent rather than either silently overwriting or silently skipping (skipping would leave a stale entry point if the rendering logic itself changed across `create-skillet` versions). This is a judgment call beyond the literal ACs (which only ask for a README note on `bin/cli.js`), justified by `docs/ux-principles.md` Principle 4 scoping "any file we own that the user might also touch" — having just fixed `.npmignore` this way, leaving `bin/cli.js` doc-only would be the same inconsistency the prior PRs were rejected for.

*Alternative considered:* leave `bin/cli.js` doc-only (README note: "don't customize this file"), matching the literal AC text. Rejected as inconsistent with the `.npmignore` fix landing in the same change, and likely to draw the same "documented workaround" rejection reasoning.

### 7. Keep all new logic testable as pure functions; keep `run.ts` branching thin
Full interactive-wizard e2e is explicitly not automated (`wizard.test.ts` documents this as a known `@inquirer/prompts`/stdin limitation). Following the codebase's established workaround, the new logic is implemented as standalone, pure functions — e.g. a files-array-append computer, a `skillet.skills` conversion computer, a metadata-diff computer, a `bin/cli.js` content-comparison — each independently unit-testable, with `run.ts`'s interactive branching kept thin and covered via the existing mocked-`@inquirer/prompts` + `process.stdout.write`-assertion pattern used in `run.test.ts`/`scaffold.test.ts`.

## Risks / Trade-offs

- **Menu adds a decision point to every re-run against an existing package** → Mitigated by keeping the menu itself lightweight (4 options, one keystroke) and by the "just check" option giving a fast escape hatch to the pre-existing `check` behavior for users who just want a read-only pass.
- **`bin/cli.js` content-diff guard could false-positive if `create-skillet`'s own rendering changes between versions (e.g. a formatting tweak), prompting existing users unnecessarily** → Mitigated by rendering the comparison target with the same function that originally wrote the file, so only *user* edits (not incidental whitespace) trigger the diff; accepted as a reasonable trade-off given the alternative (silent clobber) is the exact bug being fixed.
- **Scope growth**: this is a moderate-to-large change relative to the three prior (small, rejected) attempts, touching `run.ts`, `detect.ts`, `prompts.ts` (or a new sibling module), and `scaffold.ts` plus four test files → Mitigated by decision 7 (pure-function extraction) keeping each piece independently reviewable and testable, and by decision 2 (quick paths never touch metadata) keeping the highest-risk logic (metadata diff/consent) isolated to a single, well-scoped path.
- **`skillet.skills` parsing gap**: re-running against an existing multi-skill package today only discovers multi-skill state by re-scanning disk for `SKILL.md`, not from `package.json` → Addressed directly by decision 1's detection extension; without it, `isExistingSkilletPackage`/menu routing could misjudge a multi-skill package's current state.

## Open Questions

- Exact wording/order of the four intent-menu options and the "Changes to published metadata:" block is left to implementation/tasks — no open design ambiguity, just UI copy to finalize during TDD per existing `process.stdout.write`-assertion test conventions.
