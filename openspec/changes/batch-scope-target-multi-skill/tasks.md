## 1. Write Failing Tests (TDD)

- [ ] 1.1 Add new test cases to the existing unit test file `packages/core/test/unit/run-multi-skill.test.ts`: mock TTY + `@inquirer/prompts`, assert the `select` and `checkbox` prompt primitives are each invoked exactly once (i.e. check call count on the mocked `select`/`checkbox` exports) when installing a 2-skill package interactively
- [ ] 1.2 Add new test cases to the existing integration test file `packages/core/test/integration/install.test.ts`: use a 2-skill fixture with `--target claude --scope user --yes`, assert stdout contains exactly one line matching `2 skills × 2 targets installed` and no per-skill summary lines
- [ ] 1.3 Run tests and confirm they fail for the expected reason (prompts called twice / summary missing)

## 2. Refactor `run.ts`

- [ ] 2.1 Extract `resolveTargets(opts, isTTY)` from `runInstall()`: contains the non-interactive branch and the `runInstallPrompts()` call; returns `TargetOption[]`
- [ ] 2.2 Create `installSkill(skill, selectedTargets, pkg, hooks, opts, verbMode)`: contains the per-target spinner loop from `runInstall()` — no prompts, no summary line
- [ ] 2.3 Update `registerInstallCommand()` action handler: call `resolveTargets()` once before the skill loop; guard with "No targets selected." if empty; call `installSkill()` per skill; print single consolidated summary after the loop
- [ ] 2.4 Remove `runInstall()` entirely — do not leave a thin wrapper

## 3. Update Summary Line

- [ ] 3.1 Print `N skills × M targets installed · Xs` (TTY) after the outer loop, using skill count from the skills array and target count from `selectedTargets.length`
- [ ] 3.2 Print `[pkg.name] N skills × M targets installed` (non-TTY) after the outer loop
- [ ] 3.3 Use singular `1 skill` when N=1 and `1 target` when M=1

## 4. Verify and Clean Up

- [ ] 4.1 Run all existing tests (`pnpm test` in `packages/core`) and confirm no regressions; note that existing integration test output assertions in `packages/core/test/integration/install.test.ts` may need updating if the consolidated summary wording differs from the previous per-skill summary lines
- [ ] 4.2 Confirm new unit and integration tests pass
- [ ] 4.3 Manually verify with the `multi-skill-wizard-flow` fixture: `npx . install --target claude --scope user --yes` shows one summary; remove any debug artifacts
- [ ] 4.4 Run TypeScript type-check (`pnpm typecheck` or `tsc --noEmit`) and fix any type errors
