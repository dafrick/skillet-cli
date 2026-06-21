## 1. Tests — Codex adapter (TDD red phase)

- [x] 1.1 Add unit tests for `codexAdapter.detect()` — user scope present when `~/.codex/` exists, absent when it does not
- [x] 1.2 Add unit tests for `codexAdapter.detect()` — project scope present when `.codex/config.toml` exists in cwd, absent when it does not
- [x] 1.3 Add unit test: `.codex/` directory without `config.toml` does NOT trigger project scope detection
- [x] 1.4 Add unit tests for `codexAdapter.supportsScope()` — returns `true` for both `'user'` and `'project'`
- [x] 1.5 Add unit tests for `codexAdapter.resolveInstallPath()` — user scope returns `path.join(home, '.agents', 'skills', name)`, project scope returns `path.join(cwd, '.agents', 'skills', name)`
- [x] 1.6 Add unit test for `codexAdapter.render()` — returns `skill.sourceDir` unchanged
- [x] 1.7 Add unit test verifying `codexAdapter.id === 'codex'` and `codexAdapter.label === 'Codex CLI'`
- [x] 1.8 Add integration test verifying `codex` adapter is available via `registry.get('codex')` after import
- [x] 1.9 Add unit test verifying `agentsAdapter.label === 'Generic agents (.agents/)'`
- [x] 1.10 Run the test suite and confirm all new tests fail

## 2. Relabel the agents adapter

- [x] 2.1 Update `agentsAdapter.label` in `packages/core/src/adapters/agents.ts` from `'Agents (.agents/)'` to `'Generic agents (.agents/)'`

## 3. Create the Codex adapter (TDD green phase)

- [x] 3.1 Create `packages/core/src/adapters/codex.ts` exporting `codexAdapter`
- [x] 3.2 Set `id: 'codex'`, `label: 'Codex CLI'`
- [x] 3.3 Implement `detect()`: push `'user'` when `path.join(ctx.home, '.codex')` directory exists; push `'project'` when `path.join(ctx.cwd, '.codex', 'config.toml')` file exists
- [x] 3.4 Implement `supportsScope()`: return `true` for both `'user'` and `'project'`
- [x] 3.5 Implement `resolveInstallPath()`: user → `path.join(ctx.home, '.agents', 'skills', skill.name)`; project → `path.join(ctx.cwd, '.agents', 'skills', skill.name)`
- [x] 3.6 Implement `render()`: passthrough — return `skill.sourceDir`

## 4. Register the adapter

- [x] 4.1 Import `codexAdapter` in `packages/core/src/adapters/index.ts`
- [x] 4.2 Add `registry.register(codexAdapter)` after the existing registrations

## 5. Verification

- [x] 5.1 Run `pnpm test` in `packages/core` and confirm all tests pass
- [x] 5.2 Run `pnpm build` in `packages/core` and confirm no TypeScript errors
