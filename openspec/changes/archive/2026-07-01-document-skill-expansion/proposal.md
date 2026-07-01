## Why

`create-skillet` scaffolds a publishable npm package, but the bare command has no notion of "this package is already scaffolded" — every invocation, first-time or re-run, walks the identical full wizard and then unconditionally rewrites `.npmignore`, `bin/cli.js`, and every `package.json` metadata field via a single `npm pkg set`, with no diff shown and no distinct consent. This makes re-running against an already-published package destructive (an author-edited `.npmignore` is silently clobbered) and forces anyone who wants to do something small — add a directory to the published files, or add another skill — to run the entire wizard and put unrelated, already-published metadata (`name`/`version`/`description`/`author`) at risk in the process.

Three prior PRs (#117, #120, #122) treated this as a docs problem (print an "expand your skill" recipe) and were rejected each time: `docs/ux-principles.md` names this exact pattern — printing a workaround, or an internal detail like an array index, instead of fixing the underlying gap — as a failure mode. The maintainer has now directed that the fix be real automation inside the bare `create-skillet` re-run, with an explicit plan/preview step and diff+consent before any metadata overwrite.

## What Changes

- Fix the unconditional `.npmignore` overwrite in `executeScaffold` (guard with an existence check) — a clear, isolated bug fix.
- Extend `detectEnvironment()` to recognize an existing skillet package on re-run (parse `skillet.skills` in addition to `skillet.skillDir`, derive `isExistingSkilletPackage`, and capture the current `files[]` array).
- When the bare `create-skillet` command detects `isExistingSkilletPackage`, replace the immediate jump into the full configuration wizard with an interactive intent menu offering: add a directory to the published package, add another skill / convert to multi-skill, reconfigure everything, or just check what would be published (delegating to `create-skillet check`).
- The two new "quick" flows (add directory, add/convert skill) never touch `name`/`version`/`description`/`author`/`license`; they compute the required `files[]` addition or `skillet.skills` change programmatically (never print an array index to the user) and end with a concrete, computed plan plus a single confirmation before writing anything.
- The "reconfigure everything" path reuses the existing full wizard, but after `collectConfig()` returns, diffs `name`/`version`/`description`/`author`/`license` against the currently detected values and shows a "Changes to published metadata" block (`current → new` per changed field) before the existing preview-confirm step proceeds to write `package.json`.
- Extend the same "detect modification, don't silently clobber" treatment already applied to `.npmignore` to `bin/cli.js`: if its on-disk content differs from a freshly rendered version, warn and ask for consent instead of overwriting silently.
- Update the `create-skillet` README with an "Expanding your skill" section describing the actual menu-driven flow (what each option does, what it never touches), replacing the manual `npm pkg set` / array-index instructions proposed (and rejected) in prior PRs.

## Capabilities

### New Capabilities
- `skill-expansion-menu`: the intent-based menu (add directory / add skill / reconfigure / check) shown when `create-skillet` is re-run against an already-scaffolded package, including the computed plan-preview-confirm step for the two new narrow flows.
- `metadata-change-consent`: diffing collected metadata (`name`/`version`/`description`/`author`/`license`) against currently-published values and requiring explicit, itemized consent before `package.json` is overwritten via the reconfigure path.
- `owned-file-overwrite-guard`: detecting whether an author-owned generated file (`.npmignore`, `bin/cli.js`) has been modified since it was written, and gating any overwrite on a warning + consent rather than a silent rewrite.

### Modified Capabilities
- `skilletize-wizard`: re-running the bare command against an existing skillet package no longer always proceeds straight into the full configuration wizard — it first branches through the new intent menu, with "reconfigure everything" being the only path that still runs the existing full `collectConfig()` flow.

## Impact

- `packages/create/src/scaffold.ts` — `.npmignore` existence guard; `bin/cli.js` diff-before-overwrite; possible extraction of a "render expected file content" helper reused by the overwrite guard.
- `packages/create/src/detect.ts` — `PackageJson.skillet.skills` parsing, `isExistingSkilletPackage`, current `files[]` capture on `DetectionResult`.
- `packages/create/src/run.ts` — new intent-menu branch (using the already-mocked-but-unused `select` from `@inquirer/prompts`), plan/preview rendering for the two new quick flows, metadata-diff rendering ahead of the existing reconfigure confirm step.
- `packages/create/src/prompts.ts` (or a new sibling module) — scoped prompt flows for "add a directory" and "add/convert a skill", separate from the full `collectConfig()`.
- `packages/create/README.md` — replaced "Expanding your skill" section describing the real automated flow.
- Tests: `packages/create/src/run.test.ts`, `detect.test.ts`, `prompts.test.ts`, `scaffold.test.ts` — new pure-function coverage for detection, diffing, and plan computation, plus mocked-prompt coverage for the new branches, following the existing test pattern (interactive wizard e2e stays out of scope; logic is extracted into pure, testable functions).
