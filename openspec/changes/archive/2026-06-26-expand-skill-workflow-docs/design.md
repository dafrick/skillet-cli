## Context

`create-skillet` is a one-shot scaffolding wizard in `packages/create`. It runs `executeScaffold` (in `scaffold.ts`) to write the initial package structure, then prints a completion block (`run.ts` Step 8) with next steps. Once a skill author has published and later wants to expand their package, no guidance exists — and two unconditional writes create footguns on re-run.

The UX principles (docs/ux-principles.md) establish that users should not need to run npm commands or edit files manually. This change's scope is deliberately limited by issue #110: no new commands or flags, documentation and a `.npmignore` fix only. The `npm pkg set` guidance in the completion block and README is an explicitly accepted interim step while a proper `create-skillet add-dir` command is out of scope for this change.

## Goals / Non-Goals

**Goals:**
- Fix the `.npmignore` unconditional overwrite bug in `executeScaffold`
- Add a "To expand your skill" block to the wizard's completion output covering three scenarios
- Add an "Expanding your skill" section to `packages/create/README.md`
- Add test coverage for the `.npmignore` existence guard

**Non-Goals:**
- A new `--update` flag or `create-skillet add-dir` command (future issue)
- Pre-populating wizard prompts with existing `package.json` values
- Making `bin/cli.js` write conditional (document the behavior only)
- Touching `packages/core` or any other package

## Decisions

### Decision: `fs.existsSync` guard before `.npmignore` write

**Chosen:** Add `if (!fs.existsSync(npmignorePath))` around the `fsp.writeFile` call in `executeScaffold`.

**Rationale:** The file either exists or doesn't — no merging needed at scaffold time. The `interactive-npmignore` spec already handles append-on-triage for `create-skillet check`. The scaffold step only needs to seed `**/node_modules` on first run.

**Alternative considered:** Read-and-merge (check if `**/node_modules` is already present, add if not). Rejected: over-engineered for the scaffold path. The author may have intentionally omitted `**/node_modules` from their `.npmignore` for unusual package layouts.

**Test strategy (TDD):** Write the new test cases first:
1. Existing test (line 678–693 in `scaffold.test.ts`): passes — verifies write on first run. Keep it.
2. New test: `.npmignore` is NOT written when it already exists — set `mockFsExistsSync` to return `true` for the `.npmignore` path, assert `fsp.writeFile` was not called for it.
3. New test: existing content is preserved — use a real temp dir or verify no overwrite call.

Since the test mocks `fsp.writeFile` via `vi.mock('node:fs/promises', ...)` and uses `vi.mock('node:fs', ...)` with `existsSync: vi.fn()`, the guard can be tested by configuring `mockFsExistsSync` return values per test.

### Decision: Completion block expansion guidance is printed unconditionally

**Chosen:** Add the expansion guidance after the existing next-steps block on every successful wizard run, not conditionally on "is this a re-run".

**Rationale:** The guidance is useful on first run too — it tells the author what to do *after* they publish. Detecting "re-run" would require inspecting pre-existing `package.json` state before the wizard modifies it, adding complexity for minimal benefit. Keeping it unconditional also avoids silent omission on re-runs where the author most needs the warning.

**Alternative considered:** Print only on re-run (detect `package.json` existed before scaffold). Rejected: detection logic is fragile and the guidance is always relevant.

### Decision: README section placement

**Chosen:** New H2 section "## Expanding your skill" inserted after "## Subcommands" and before "## Changelog".

**Rationale:** Authors who have already used the tool look for "what next" content after they understand the commands. The Changelog is historical context; expansion guidance is forward-looking operational content that belongs before it.

### Decision: Accept `npm pkg set` instructions in completion block and README

**Chosen:** Include concrete `npm pkg set files[2]=newdir/` instructions as specified by the issue acceptance criteria.

**Rationale:** Issue #110 explicitly scopes out a new command and accepts `npm pkg set` guidance as the interim solution. This is an acknowledged gap against the UX principles — the `npm pkg set` instruction will be replaced when a `create-skillet add-dir` command is implemented in a future issue. The completion block and README both note the index caveat.

**UX principle tension:** The UX principles (Principle 2, Failure Modes) prohibit instructing users to run npm commands. This design deviates from that principle by explicit issue scope constraint. A future change should add a `create-skillet add-dir` command that removes this instruction.

## Risks / Trade-offs

- **`files` array index is fragile** → The `files[2]` index only holds for a standard single-skill layout where `files[0]=bin` and `files[1]=<skillDir>`. The guidance must include the caveat that the index depends on the current `files` array, and should recommend running `npm pkg get files` first. Risk is low since the README and completion block both include this caveat.

- **`bin/cli.js` overwrite documentation** → The note that `bin/cli.js` is always overwritten is a documentation-only mitigation. If an author customizes `bin/cli.js` despite the warning, they will lose changes on re-run. The code fix (checking for modifications before overwriting) is out of scope per the issue. Risk is low since `bin/cli.js` is boilerplate with no reason to customize.

- **Mock coverage for `.npmignore` guard** → The existing test suite mocks `fs.existsSync` via `vi.mock('node:fs', ...)`. Adding the guard requires confirming the mock is wired to the correct import path (`node:fs`, not `fs`). If `scaffold.ts` imports from `'fs'` without the `node:` prefix, the mock may not intercept it. This must be verified before writing the guard test.

## Migration Plan

No migration needed. The `.npmignore` guard is backward-compatible: first-run behavior is unchanged (file doesn't exist → write as before). The completion block addition is purely additive. The README section is additive.
