## 1. Test (write failing test first)

- [ ] 1.1 In `test/unit/skill-dir-post-move.test.ts`, add a test asserting that after a successful move `console.log` is called with a string containing `skillDir updated to: ./skill/`

## 2. Implementation

- [ ] 2.1 In `packages/create/src/skill-dir.ts`, inside `setupSkillDir`, add `console.log('  skillDir updated to: ./skill/')` immediately after the move loop completes and before the `npm pkg set skillet.skillDir=./skill/` call

## 3. Verification

- [ ] 3.1 Run the unit tests and confirm the new assertion passes: `pnpm --filter @skillet-cli/create test`
- [ ] 3.2 Confirm no other tests regress
