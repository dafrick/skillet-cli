## Why

The top-of-file docblock in `packages/create/test/unit/skill-dir-post-move.test.ts` claims that `setupSkillDir` rewrites `bin/cli.js` after moving files — but that behavior was removed in commit `67f0faf` when `package.json`'s `skillet.skillDir` field became the source of truth. The docblock contradicts both the implementation and the tests in the same file, misleading any reader who relies on it to understand post-move behavior.

## What Changes

- Fix the top-of-file docblock in `packages/create/test/unit/skill-dir-post-move.test.ts` (lines 1–9) to remove the stale claim about rewriting `bin/cli.js` and accurately describe the single post-move action: running `npm pkg set skillet.skillDir=./skill/`.

## Capabilities

### New Capabilities
<!-- None — this is a comment-only bug fix with no behavior changes -->

### Modified Capabilities
<!-- None — the tests and implementation are already correct; only the docblock is wrong -->

## Impact

- **File changed:** `packages/create/test/unit/skill-dir-post-move.test.ts` (lines 1–9 only)
- **No logic changes:** test assertions, source files, and all other code remain untouched
- **No API or dependency impact**
