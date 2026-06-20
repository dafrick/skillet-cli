## 1. Tests (write first — TDD red phase)

- [ ] 1.1 Add unit tests for `geminiAdapter.detect()` — user scope present/absent, project scope present/absent
- [ ] 1.2 Add unit tests for `geminiAdapter.supportsScope()` — both `'user'` and `'project'` return true
- [ ] 1.3 Add unit tests for `geminiAdapter.resolveInstallPath()` — user scope returns `~/.gemini/skills/<name>/`, project scope returns `<cwd>/.gemini/skills/<name>/`
- [ ] 1.4 Add unit test for `geminiAdapter.render()` — returns `skill.sourceDir`
- [ ] 1.5 Add integration test confirming `registry.list()` includes `gemini` after package import
- [ ] 1.6 Run the test suite and confirm these new tests fail (adapter does not exist yet)

## 2. Implement Gemini Adapter (TDD green phase)

- [ ] 2.1 Create `packages/core/src/adapters/gemini.ts` exporting `geminiAdapter` with `id: 'gemini'`, `label: 'Gemini CLI'`
- [ ] 2.2 Implement `detect()` to check `path.join(ctx.home, '.gemini')` for user scope and `path.join(ctx.cwd, '.gemini')` for project scope
- [ ] 2.3 Implement `supportsScope()` to return `true` for both `'user'` and `'project'`
- [ ] 2.4 Implement `resolveInstallPath()` to return `path.join(ctx.home, '.gemini', 'skills', skill.name)` for user scope and `path.join(ctx.cwd, '.gemini', 'skills', skill.name)` for project scope
- [ ] 2.5 Implement `render()` as a passthrough that returns `skill.sourceDir`

## 3. Register Adapter

- [ ] 3.1 Import `geminiAdapter` in `packages/core/src/adapters/index.ts`
- [ ] 3.2 Add `registry.register(geminiAdapter)` after the existing three registrations

## 4. Verify

- [ ] 4.1 Run the full test suite (`pnpm test`) and confirm all tests pass
- [ ] 4.2 Confirm TypeScript compiles without errors (`pnpm -F @skillet-cli/core build`)
