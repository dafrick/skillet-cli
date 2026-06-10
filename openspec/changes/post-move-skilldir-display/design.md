## Context

The `create-skillet` wizard collects `skillDir` early (via `collectConfig`) and displays it in a pre-confirmation summary. A later phase — `setupSkillDir` in `packages/create/src/skill-dir.ts` — physically moves files and updates `package.json`'s `skillet.skillDir` to `./skill/` via `npm pkg set`. This update happens silently: the user sees per-file move lines but no acknowledgment that the configuration value changed. The last `skillDir` the user explicitly confirmed was `./` (or whatever they entered), not `./skill/`.

Current `setupSkillDir` signature: `async function setupSkillDir(detected: DetectedEnvironment): Promise<void>`.

## Goals / Non-Goals

**Goals:**
- Print a single line immediately after files are moved confirming the new `skillDir` value.
- Add a unit test asserting that line appears in stdout.
- Add a spec scenario requiring this display.

**Non-Goals:**
- Changing the pre-confirmation summary or when `skillDir` is collected.
- Modifying the completion banner.
- Changing the return type of `setupSkillDir`.
- E2E or integration test coverage.
- Any change to `detect.ts`, `scaffold.ts`, `prompts.ts`, `run.ts`, or `bin/cli.js` generation.

## Decisions

**Decision: Print inside `setupSkillDir`, not in the caller (`run.ts`)**

`setupSkillDir` already owns the move output (`Moved SKILL.md`, etc.). Placing the `skillDir updated to:` line adjacent to that output keeps all move-phase disclosure in one place and avoids the caller needing to know what `setupSkillDir` changed.

Alternatives considered:
- Return the new `skillDir` from `setupSkillDir` and print it in `run.ts` → heavier change, puts the disclosure farther from the move output, and requires changing the function signature.
- Update the completion banner → too distant from where the change occurs; user may not connect the banner to the `skillDir` update.

**Decision: Message format `  skillDir updated to: ./skill/`**

This mirrors the indentation style of the per-file move lines and uses the same key name (`skillDir`) that appears in the pre-confirmation summary. The value is hardcoded as `./skill/` since `setupSkillDir` always targets that directory.

**Decision: Test-first implementation**

Write the unit test asserting the new output line before adding the `console.log` in `skill-dir.ts`. The existing test file (`test/unit/skill-dir-post-move.test.ts`) already stubs `execSync` and captures stdout — the new assertion slots in cleanly.

## Risks / Trade-offs

**[Risk] Hardcoded `./skill/` path** → `setupSkillDir` already hardcodes this target; the display value is consistent with the actual behavior. No new risk introduced.

**[Risk] Test captures console output** → The existing tests already spy on `console.log`; the new assertion reuses the same pattern. Low risk.
