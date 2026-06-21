## 1. Tests (write first — TDD red phase)

- [x] 1.1 Add unit tests for `geminiAdapter.detect()` — user scope present/absent, project scope present/absent
- [x] 1.2 Add unit tests for `geminiAdapter.supportsScope()` — both `'user'` and `'project'` return true
- [x] 1.3 Add unit tests for `geminiAdapter.resolveInstallPath()` — user scope returns `~/.gemini/skills/<name>/`, project scope returns `<cwd>/.gemini/skills/<name>/`
- [x] 1.4 Add unit test for `geminiAdapter.render()` — returns `skill.sourceDir`
- [x] 1.5 Add integration test confirming `registry.list()` includes `gemini` after package import
- [x] 1.6 Run the test suite and confirm these new tests fail (adapter does not exist yet)

## 2. Implement Gemini Adapter (TDD green phase)

- [x] 2.1 Create `packages/core/src/adapters/gemini.ts` exporting `geminiAdapter` with `id: 'gemini'`, `label: 'Gemini CLI'`
- [x] 2.2 Implement `detect()` to check `path.join(ctx.home, '.gemini')` for user scope and `path.join(ctx.cwd, '.gemini')` for project scope
- [x] 2.3 Implement `supportsScope()` to return `true` for both `'user'` and `'project'`
- [x] 2.4 Implement `resolveInstallPath()` to return `path.join(ctx.home, '.gemini', 'skills', skill.name)` for user scope and `path.join(ctx.cwd, '.gemini', 'skills', skill.name)` for project scope
- [x] 2.5 Implement `render()` as a passthrough that returns `skill.sourceDir`

## 3. Register Adapter

- [x] 3.1 Import `geminiAdapter` in `packages/core/src/adapters/index.ts`
- [x] 3.2 Add `registry.register(geminiAdapter)` after the existing three registrations

## 4. Verify

- [x] 4.1 Run the full test suite (`pnpm test`) and confirm all tests pass
- [x] 4.2 Confirm TypeScript compiles without errors (`pnpm -F @skillet-cli/core build`)
