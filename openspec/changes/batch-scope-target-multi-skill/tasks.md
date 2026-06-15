## 1. Write Failing Tests (TDD)

- [ ] 1.1 Add unit test in `packages/core/src/__tests__/run-batch-prompt.test.ts`: mock TTY + `@inquirer/prompts`, assert scope prompt and target checkbox each fire exactly once when installing a 2-skill package interactively
- [ ] 1.2 Add integration test in `packages/core/src/__tests__/run-multi-skill.test.ts` (or a new file): use a 2-skill fixture with `--target claude --scope user --yes`, assert stdout contains exactly one line matching `2 skills × 2 targets installed` and no per-skill summary lines
- [ ] 1.3 Run tests and confirm they fail for the expected reason (prompts called twice / summary missing)

## 2. Refactor `run.ts`

- [ ] 2.1 Extract `resolveTargets(opts, isTTY)` from `runInstall()`: contains the non-interactive branch and the `runInstallPrompts()` call; returns `TargetOption[]`
- [ ] 2.2 Create `installSkill(skill, selectedTargets, pkg, hooks, opts, verbMode)`: contains the per-target spinner loop from `runInstall()` — no prompts, no summary line
- [ ] 2.3 Update `registerInstallCommand()` action handler: call `resolveTargets()` once before the skill loop; guard with "No targets selected." if empty; call `installSkill()` per skill; print single consolidated summary after the loop
- [ ] 2.4 Remove `runInstall()` or reduce it to a thin wrapper calling `resolveTargets()` + `installSkill()` for backward compatibility if needed (prefer removal)

## 3. Update Summary Line

- [ ] 3.1 Print `N skills × M targets installed · Xs` (TTY) after the outer loop, using skill count from the skills array and target count from `selectedTargets.length`
- [ ] 3.2 Print `[pkg.name] N skills × M targets installed` (non-TTY) after the outer loop
- [ ] 3.3 Use singular `1 skill` when N=1 and `1 target` when M=1

## 4. Verify and Clean Up

- [ ] 4.1 Run all existing tests (`pnpm test` in `packages/core`) and confirm no regressions
- [ ] 4.2 Confirm new unit and integration tests pass
- [ ] 4.3 Manually verify with the `multi-skill-wizard-flow` fixture: `npx . install --target claude --scope user --yes` shows one summary; remove any debug artifacts
- [ ] 4.4 Run TypeScript type-check (`pnpm typecheck` or `tsc --noEmit`) and fix any type errors
