## 1. Fix the stale docblock

- [ ] 1.1 In `packages/create/test/unit/skill-dir-post-move.test.ts`, replace lines 1–9 with the corrected docblock that removes the claim about rewriting `bin/cli.js` and retains the `npm pkg set` description and mock-strategy note

## 2. Verify no regressions

- [ ] 2.1 Run the `packages/create` test suite (`pnpm --filter @skillet/create test`) and confirm all tests pass
