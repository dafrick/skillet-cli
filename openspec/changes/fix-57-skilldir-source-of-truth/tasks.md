## 1. Core: Extend types and marker

- [ ] 1.1 Add `skillDir?: string` to `SkilletPackageJson` interface in `packages/core/src/types.ts`
- [ ] 1.2 Add `directSkillDir?: string` to `SkilletMarker` interface in `packages/core/src/marker.ts`
- [ ] 1.3 Update `readSkilletMarker` to detect `skillet.skillDir`, resolve it to an absolute path, and return it as `directSkillDir` (with `skillsDirs: []`)
- [ ] 1.4 Ensure `skillDir` takes precedence over `skills` when both are present in `readSkilletMarker`

## 2. Core: Update `run()` to use `directSkillDir`

- [ ] 2.1 In `packages/core/src/run.ts`, after receiving the marker result, check for `marker.directSkillDir` and use it as `invokedSkillDirs = [marker.directSkillDir]` instead of calling `discoverSkillTrees`
- [ ] 2.2 Verify that existing `skillDir` argument to `run()` still takes precedence over all package.json config (no behavior change for programmatic callers)

## 3. Core: Tests for marker and run

- [ ] 3.1 Create `packages/core/test/unit/marker.test.ts` (or add to existing) with tests for `readSkilletMarker` when `skillet.skillDir` is present, including resolution to absolute path, precedence over `skills`, and the null/absent cases
- [ ] 3.2 Add/update integration test in `packages/core/test/integration/` to verify `run()` installs correctly when only `skillet.skillDir` is set in `package.json` (no `skillDir` argument passed to `run()`)

## 4. Create: Simplify `buildBinCliJs`

- [ ] 4.1 Remove the `skillDir` parameter from `buildBinCliJs()` in `packages/create/src/scaffold.ts`
- [ ] 4.2 Update the generated template to emit `await run({ pkg })` with no `skillDir` argument and no `fileURLToPath`/`new URL` imports
- [ ] 4.3 Update all call sites of `buildBinCliJs()` in `scaffold.ts` (initial write) and `skill-dir.ts` (post-move rewrite) to remove the skillDir argument

## 5. Create: Simplify post-move step

- [ ] 5.1 Remove the `bin/cli.js` rewrite from `setupSkillDir()` in `packages/create/src/skill-dir.ts` — keep only the `npm pkg set skillet.skillDir=./skill/` update
- [ ] 5.2 Remove the import of `buildBinCliJs` from `skill-dir.ts` if it is no longer needed

## 6. Create: Update tests

- [ ] 6.1 Update `packages/create/test/unit/scaffold.test.ts` — update any tests that check the `buildBinCliJs` output to reflect the new no-argument signature and simpler output
- [ ] 6.2 Update `packages/create/test/unit/skill-dir-post-move.test.ts` — assert that `bin/cli.js` is NOT rewritten after the file-move step; assert that `npm pkg set skillet.skillDir=./skill/` IS still called

## 7. Verify

- [ ] 7.1 Run `pnpm test` in the repo root and confirm all tests pass
- [ ] 7.2 Confirm TypeScript compilation passes with no errors (`pnpm -r build` or `pnpm typecheck`)
