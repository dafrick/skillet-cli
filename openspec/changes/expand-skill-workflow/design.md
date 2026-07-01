## Context

`create-skillet` is a one-shot scaffolding wizard (`packages/create/src/run.ts` orchestrates, `packages/create/src/scaffold.ts` executes npm-native setup steps). It was designed for first-run scaffolding and was never revisited for the "author comes back later" case. Two problems surfaced from issue #110:

1. `executeScaffold` (in `scaffold.ts`, lines ~115–119) writes `.npmignore` unconditionally on every invocation, with no existence check — unlike the `npm init` step a few lines above (line 43), which already guards with `if (!fs.existsSync(pkgJsonPath))`. Any entries added by the separate interactive triage flow (`npmignore-triage.ts`) are silently destroyed on re-run.
2. The wizard's completion block (`run.ts`, "Step 8: Completion block", lines 174–207) and the package README have no guidance at all for what to do after the first successful run: adding a new content directory, doing a routine version bump, or restructuring. The wizard also silently resets `name`/`version`/`description`/`author` on any re-run via unconditional `npm pkg set` args (`scaffold.ts` lines 65–81) — a footgun for a package that has already been published, since re-running would knock a published `1.2.0` back down to whatever the prompts default to (typically `0.1.0`).

## Goals / Non-Goals

**Goals:**
- Stop `.npmignore` from being clobbered on re-run, matching the "don't clobber" behavior already established elsewhere in the codebase (triage flow, `npm init` guard).
- Give authors a clear, in-terminal and in-README answer to "how do I expand this package now that it's published," covering the three realistic scenarios: add a directory, bump a version, restructure.
- Make the existing footguns (wizard re-run resets metadata; `bin/cli.js` is always regenerated) explicit and impossible to miss, rather than fixing them by changing wizard behavior.
- Keep the new completion-block guidance unit-testable, following the codebase's existing pattern of extracting printable logic into small pure functions (`deriveOwnerRepo`, `skillMdStatus`) rather than inlining more `process.stdout.write` calls with no test coverage.

**Non-Goals:**
- No `--update` flag or `skillet update` command. This change does not alter the wizard's control flow, prompt set, or add any new CLI entry points.
- No change to what the wizard prompts for, prompt ordering, or pre-population of existing `package.json` values into prompt defaults beyond what already happens in `prompts.ts`/`detect.ts`.
- No `fs.existsSync` guard around the `bin/cli.js` write in `scaffold.ts` (lines 106–110) — that stays unconditional; it is documented, not changed.
- No modification to `check.ts` or `npmignore-triage.ts` — both already behave correctly and are only referenced.

## Decisions

**1. Guard the `.npmignore` write with a plain existence check, not a merge/append.**
Mirror the exact pattern already used for `npm init` (`if (!fs.existsSync(pkgJsonPath))`) rather than reading and merging existing content. Scaffold-time initialization and the triage flow's append-only behavior are different operations serving different purposes (bootstrap vs. curated exclusion list); conflating them by making scaffold "smart" about merging would add complexity for a case (an author having both a hand-written `.npmignore` and re-running `create-skillet`) that is adequately served by "leave it alone."
- *Alternative considered*: Read the existing file and append `**/node_modules` if missing. Rejected — adds complexity and a new spec surface for a line that a scaffolded skill package will have received on first run in the overwhelming majority of cases; if an author deleted `**/node_modules` on purpose, forcing it back in would be its own footgun.

**2. Extract completion-block guidance text into a pure function, not inline `process.stdout.write` calls.**
Add a function (working name `buildExpansionGuidance`) in `run.ts` that takes whatever config/detection data it needs and returns a string (or array of lines) to print. This follows the existing precedent of `deriveOwnerRepo` and `skillMdStatus`, both already extracted from `run.ts`'s action handler for testability. Without this, the new guidance text is exercised by nothing but a human reading terminal output, same gap that exists today for the current "Next steps:" block.
- *Alternative considered*: Inline the new `process.stdout.write` calls directly after the existing "Next steps:" block. Rejected — perpetuates the current untested state and makes future wording changes riskier to verify.

**3. Document the `files[]` index guidance with an explicit caveat, not a hardcoded instruction.**
The guidance (terminal and README) says the next available index is typically `files[2]` for a single-skill package (`files[0]=bin`, `files[1]=<skillDir>`) but explicitly tells the author to check their current `files` array first — because multi-skill packages or packages with prior manual edits will have a different length. This avoids the guidance itself becoming a footgun (an author blindly running `npm pkg set files[2]=...` and clobbering an existing multi-skill entry).

**4. Document, don't fix, the metadata-reset and `bin/cli.js` overwrite behaviors.**
Both are called out explicitly in the new completion-block text and README section as warnings before recommending "re-run `create-skillet` for structural changes." This is a deliberate scope boundary per the issue and discovery: fixing wizard re-run semantics (e.g., pre-populating from existing `package.json`, only setting fields that changed) is a larger behavior change with its own risk profile (e.g., what if the author *wants* to reset a field?) and is explicitly out of scope for this minor change.

**5. Spec delta lives under the existing `skilletize-wizard` capability, not a new capability.**
Both the `.npmignore` fix and the completion-block guidance are scaffold/wizard behaviors already governed by `skilletize-wizard`'s spec (which documents scaffold steps in the same file, e.g. "Wizard displays next steps on completion," "Execution uses only native npm commands"). Adding a new capability for two additive requirements against an existing, already-specified surface would fragment the spec for no benefit.

## Risks / Trade-offs

- **[Risk]** The path-aware `fs.existsSync` mock rewrite in `scaffold.test.ts` could accidentally mask true first-run behavior (e.g., over-mocking `true` for `.npmignore` when it should be `false`, silently keeping the old bug green). → **Mitigation**: task plan requires a red test first (assert no-clobber, watch it fail against current code), then the guard, then confirm green — enforced via TDD in tasks.md.
- **[Risk]** Extracting completion-block text into a function changes `run.ts`'s control flow slightly (a new function call replacing several `process.stdout.write` calls); a careless extraction could change existing "Next steps:" wording or ordering as a side effect. → **Mitigation**: keep the extraction scoped to only the *new* expansion-guidance block; leave the existing "Next steps:" `process.stdout.write` calls untouched, and add the new block as an appended, separately-testable function.
- **[Trade-off]** Documenting rather than fixing the metadata-reset and `bin/cli.js`-overwrite footguns leaves the underlying rough edges in place. Accepted per the issue's explicit scope and the discovery's minor-change classification; a future issue can address wizard re-run semantics if desired.

## Migration Plan

No migration needed — this is additive (guidance text, README section, changelog entry) plus a narrowly-scoped bug fix that only changes behavior in the previously-buggy case (re-running `create-skillet` when `.npmignore` already exists). First-run behavior (no existing `.npmignore`) is unchanged. No feature flag or rollback mechanism required; if the guard caused an issue it would be reverted via a normal follow-up PR.

## Open Questions

- Exact working name/shape of the extracted completion-block helper (`buildExpansionGuidance` vs. inline constant array of lines) is left to the Implement stage's TDD process — the test should drive the final signature.
