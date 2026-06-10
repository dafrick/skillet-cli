## 1. Update Unit Tests (Test-First)

- [ ] 1.1 In `packages/create/test/unit/scaffold.test.ts`, add a spy on `process.stdout.write` in the test setup (using `vi.spyOn(process.stdout, 'write')`)
- [ ] 1.2 Add a test asserting that a message containing `@skillet-cli/core` is written to stdout before the npm install `spawnSync` call during a full `executeScaffold` run
- [ ] 1.3 Add a test asserting that `spinner.start` is NOT called immediately before the install `spawnSync` call (mock `createSpinner` and assert `start` call count for the install step)
- [ ] 1.4 Add a test asserting that a plain confirmation message is written to stdout after the install `spawnSync` call completes with status 0
- [ ] 1.5 Verify all new tests fail with the current `scaffold.ts` implementation (red phase)

## 2. Implement `scaffold.ts` Changes

- [ ] 2.1 In `packages/create/src/scaffold.ts`, remove the `spinner.start('Firing up @skillet-cli/core install…')` call before the `spawnSync` install call
- [ ] 2.2 Add `process.stdout.write('Installing @skillet-cli/core (this may take a few minutes on first run)…\n')` immediately before the `spawnSync` install call
- [ ] 2.3 Remove the `spinner.succeed('Firing up done')` call after the `spawnSync` install call
- [ ] 2.4 Add `process.stdout.write('Install complete.\n')` immediately after verifying the install exited with status 0
- [ ] 2.5 Confirm `stdio: 'inherit'` is retained on the install `spawnSync` call (no change needed — verify only)

## 3. Verify Tests Pass

- [ ] 3.1 Run `pnpm --filter @skillet-cli/create test` and confirm all tests pass (green phase)
- [ ] 3.2 Run `pnpm --filter @skillet-cli/create typecheck` and confirm no type errors
- [ ] 3.3 Run `pnpm --filter @skillet-cli/create lint` and confirm no lint errors
