## 1. Makefile

- [x] 1.1 Create `Makefile` in `packages/core/` with `build`, `clean`, `watch` targets
- [x] 1.2 Add `test`, `test-unit`, `test-integration`, `test-e2e`, `test-coverage` targets
- [x] 1.3 Add `lint`, `format`, `typecheck` targets
- [x] 1.4 Mark all targets `.PHONY`
- [x] 1.5 Add `--preserveWatchOutput` to watch target so recompile output is not cleared
- [x] ~~1.5 Make `run` depend on `build` and use `--help` to exit cleanly~~ (removed — see below)

## 2. Documentation

- [x] 2.1 Add "Local Build & Manual Testing" section to `CONTRIBUTING.md`
- [x] 2.2 Document `make build`, `make clean`, `make watch` in a reference table
- [x] 2.3 Add smoke-test instructions using `make build && node bin/cli.js`
- [x] 2.4 Add watch-mode iteration instructions
- [x] 2.5 Add local skill project linking instructions using `pnpm link --global`

## 3. Verification

- [x] 3.1 Verify `make build` compiles successfully
- [x] 3.2 Verify `make clean` removes `dist/` and `coverage/`
- [x] 3.3 Verify `make watch` recompiles on file save and output is visible
- [x] 3.4 Verify `make test-unit` and `make test-integration` pass
- [x] 3.5 Verify `make typecheck` exits 0

## Changes from original design

- Makefile moved from repo root to `packages/core/` — it only applies to that package
- `make run` removed — `pnpm exec <bin>` resolves the globally installed version when a published copy is present; `node bin/cli.js` is documented in CONTRIBUTING instead
- `make watch` gained `--preserveWatchOutput` — TypeScript 6 clears the terminal by default, making watch output invisible
