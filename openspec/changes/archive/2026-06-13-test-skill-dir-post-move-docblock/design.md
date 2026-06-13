## Context

`packages/create/test/unit/skill-dir-post-move.test.ts` has a nine-line JSDoc block at the top of the file. When this test file was written, `setupSkillDir` rewrote `bin/cli.js` as part of its post-move work. That step was removed in commit `67f0faf` — but the docblock was never updated. The source file (`skill-dir.ts`) already carries an inline comment stating "bin/cli.js does not need to be rewritten." The test assertions themselves are accurate. Only the docblock is wrong.

## Goals / Non-Goals

**Goals:**
- Replace the stale docblock with one that accurately describes the single post-move action (`npm pkg set skillet.skillDir=./skill/`) and notes that `bin/cli.js` is no longer rewritten.

**Non-Goals:**
- Changes to any test assertions
- Changes to `skill-dir.ts` or any other source file
- Changes to `bin/cli.js` or scaffold logic
- Changes to any other test files

## Decisions

**Inline edit only.** The fix is a targeted replacement of lines 1–9 of the test file. No new files, no moved code, no logic changes. This keeps the diff minimal and the review trivial.

**Exact replacement text** (agreed during discovery):
```
/**
 * Tests for post-move update behavior in setupSkillDir.
 *
 * After files are moved into skill/, the wizard must:
 *  1. Run `npm pkg set skillet.skillDir=./skill/` to update package.json
 *     (bin/cli.js is NOT rewritten — package.json is the source of truth)
 *
 * These tests use the same mock strategy as scaffold.test.ts.
 */
```

This wording mirrors the inline comment already present in `skill-dir.ts`, keeping the two files consistent.

## Risks / Trade-offs

**Risk:** None meaningful — the change touches only a comment. The test suite for `packages/create` serves as the regression check; all existing assertions remain unchanged and must continue to pass.
