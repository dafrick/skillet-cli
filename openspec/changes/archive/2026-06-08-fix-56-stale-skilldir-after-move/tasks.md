## 1. Export shared helpers from scaffold.ts

- [x] 1.1 Export `buildBinCliJs(skillDir: string): string` from `packages/create/src/scaffold.ts`
- [x] 1.2 Export the `runSync` helper from `packages/create/src/scaffold.ts` so `skill-dir.ts` can reuse it

## 2. Add post-move update logic to skill-dir.ts

- [x] 2.1 Import `buildBinCliJs` and `runSync` from `./scaffold.js` in `packages/create/src/skill-dir.ts`
- [x] 2.2 After the move loop completes successfully (selectedItems.length > 0 and all moves succeed), rewrite `bin/cli.js` using `buildBinCliJs('skill/')` — write the file at `path.join(cwd, 'bin', 'cli.js')`
- [x] 2.3 After rewriting `bin/cli.js`, call `runSync('npm', ['pkg', 'set', 'skillet.skillDir=./skill/'], 'npm pkg set skillet.skillDir')` to update `package.json`

## 3. Tests for post-move update behavior

- [x] 3.1 Add unit test: when `setupSkillDir` moves files, it rewrites `bin/cli.js` to reference `skill/`
- [x] 3.2 Add unit test: when `setupSkillDir` moves files, it calls `npm pkg set skillet.skillDir=./skill/`
- [x] 3.3 Add unit test: when no files are selected (empty selectedItems), `bin/cli.js` is NOT rewritten and `npm pkg set` is NOT called
- [x] 3.4 Add unit test: when the user declines the move (proceed = false), no update occurs

## 4. Verify existing tests still pass

- [x] 4.1 Run `pnpm --filter create-skillet test` and confirm all existing tests pass with no regressions
