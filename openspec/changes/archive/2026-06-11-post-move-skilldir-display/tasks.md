## 1. Test (write failing test first)

- [x] 1.1 In `packages/create/test/unit/skill-dir-post-move.test.ts`, add a new test that:
  - Calls `vi.spyOn(process.stdout, 'write')` to capture writes (restore via `mockRestore()` after the test)
  - Sets up mocks for a successful move (skill/ absent, one file selected, confirm returns true)
  - Calls `await setupSkillDir(makeDetected())`
  - Asserts the spy was called with a string containing `skillDir updated to: ./skill/`

## 2. Implementation

- [x] 2.1 In `packages/create/src/skill-dir.ts`, inside `setupSkillDir`, add `process.stdout.write('  skillDir updated to: ./skill/\n')` immediately after the move loop completes and before the `runSync('npm', ['pkg', 'set', 'skillet.skillDir=./skill/'], ...)` call

## 3. Verification

- [x] 3.1 Run the unit tests and confirm the new assertion passes: `pnpm --filter create-skillet test`
- [x] 3.2 Confirm no other tests regress
