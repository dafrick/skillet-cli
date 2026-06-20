## 1. Extend Adapter interface (prerequisite)

- [ ] 1.1 Add optional `renderFile?(skill: NormalizedSkill, ctx: Context): Promise<string>` to the `Adapter` interface in `packages/core/src/adapters/types.ts`
- [ ] 1.2 Widen `render()` parameter from `NormalizedSkillBase` to `NormalizedSkill` in the `Adapter` interface
- [ ] 1.3 Update all existing adapters (`claude.ts`, `copilot.ts`, `agents.ts`) to use the widened `NormalizedSkill` parameter type (passthrough — no behavior change, just type update)
- [ ] 1.4 Update the installer to check `typeof adapter.renderFile === 'function'`: when true, call `renderFile()` and write the returned string as `<skill.name>.mdc` inside `resolveInstallPath()`; when absent, use existing directory-copy behavior

## 2. Tests — cursor adapter (TDD red phase)

- [ ] 2.1 Add unit tests for `cursorAdapter.detect()` — project scope detected when `.cursor` exists in cwd, not detected when absent
- [ ] 2.2 Add unit test for `cursorAdapter.detect()` — never returns `'user'` scope
- [ ] 2.3 Add unit test for `cursorAdapter.resolveInstallPath()` — returns `<cwd>/.cursor/rules/<name>` (a directory, no `.mdc` suffix)
- [ ] 2.4 Add unit tests for `cursorAdapter.renderFile()` — resolved string starts with `---\ndescription: <skill.description>\nalwaysApply: false\n---\n` followed by `skill.body`
- [ ] 2.5 Add unit test for `cursorAdapter.renderFile()` — `description` in frontmatter equals `skill.description`
- [ ] 2.6 Add unit test for `cursorAdapter.supportsScope('user')` — returns `false`
- [ ] 2.7 Add unit test for `cursorAdapter.supportsScope('project')` — returns `true`
- [ ] 2.8 Add unit test verifying `cursorAdapter.renderFile` is a function and `claudeAdapter.renderFile` is `undefined`
- [ ] 2.9 Add integration test verifying `cursor` adapter is registered and retrievable via `registry.get('cursor')`
- [ ] 2.10 Run the test suite and confirm these new tests fail

## 3. Implement Cursor Adapter (TDD green phase)

- [ ] 3.1 Create `packages/core/src/adapters/cursor.ts` with `cursorAdapter`
- [ ] 3.2 Set `id: 'cursor'`, `label: 'Cursor'`
- [ ] 3.3 Implement `detect()`: check `fs.existsSync(path.join(ctx.cwd, '.cursor'))` for project scope only
- [ ] 3.4 Implement `supportsScope()`: return `true` for `'project'`, `false` for `'user'`
- [ ] 3.5 Implement `resolveInstallPath()`: return `path.join(ctx.cwd, '.cursor', 'rules', skill.name)` for project scope
- [ ] 3.6 Implement `render()`: passthrough — return `skill.sourceDir` (required by interface; not used when `renderFile` is present)
- [ ] 3.7 Implement `renderFile(skill, ctx)`: return `---\ndescription: ${skill.description}\nalwaysApply: false\n---\n${skill.body}`

## 4. Register the Adapter

- [ ] 4.1 Import `cursorAdapter` in `packages/core/src/adapters/index.ts`
- [ ] 4.2 Call `registry.register(cursorAdapter)` alongside the existing adapters

## 5. Verification

- [ ] 5.1 Run `pnpm test` in `packages/core` and confirm all tests pass
- [ ] 5.2 Run `pnpm build` in `packages/core` and confirm no TypeScript errors
