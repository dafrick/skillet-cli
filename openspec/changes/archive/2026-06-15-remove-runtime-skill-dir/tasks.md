## 1. Remove skillDir from RunOptions

- [x] 1.1 Remove `skillDir?: string` from the `RunOptions` interface in `packages/core/src/run.ts`
- [x] 1.2 Remove the `if (skillDir !== undefined)` branch from `run()`; always read from `package.json`
- [x] 1.3 Update the error message to name both `skillet.skillDir` and `skillet.skills` as expected fields

## 2. Migrate tests

- [x] 2.1 Update `backcompat.test.ts` — write `package.json` with `skillet: { skillDir }` instead of passing runtime `skillDir`
- [x] 2.2 Update `verb-mode.test.ts` — add `writePkg()` helper; remove `skillDir` from all `run()` calls
- [x] 2.3 Update `run-ctrl-c.test.ts` — write `package.json` with `skillet: { skillDir }` after skill dir creation
- [x] 2.4 Update `run-multi-skill.test.ts` — convert "single skillDir provided explicitly" test to use `package.json`

## 3. Update specs

- [x] 3.1 `cli-surface` — remove `skillDir` from RunOptions property list; update scenarios to use `run({ pkg })`
- [x] 3.2 `skill-package-marker` — remove "Explicit skillDir passed to run() is honored" requirement block
- [x] 3.3 `skilldir-direct-path` — remove "Programmatic skillDir argument to run()" requirement
- [x] 3.4 `dependency-install` — remove "or the skillDir argument to run()" clause from seeding requirement
- [x] 3.5 `npm-readme` — remove `skillDir` row from the RunOptions table requirement
