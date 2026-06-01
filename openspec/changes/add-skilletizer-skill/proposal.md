## Why

The `hello-skill` fixture installs a useless placeholder skill and gives authors nothing useful to study when learning how to ship their own Skillet packages. Replacing it with "Skilletize" — a generic skill that guides any AI agent through converting raw skill files into a publishable Skillet npm package — makes the bundled demo self-referentially useful while showcasing the multi-file skill structure Skillet supports.

## What Changes

- Replace `packages/core/fixtures/hello-skill/` with `packages/core/fixtures/skilletize/`
  - `SKILL.md`: Rich generic skill content teaching an AI agent to scaffold a Skillet npm package from an existing skill file or directory
  - `resources/package.json.template`: Template `package.json` for new Skillet packages (name, version, bin, dependencies)
  - `resources/bin/cli.js`: Template CLI entry point wiring `@skillet-cli/core`'s `run()`
- Update `packages/core/bin/cli.js` to point to the new `skilletize` fixture directory
- Update all test and spec references that hard-code the `hello-skill` path

## Capabilities

### New Capabilities

- `skilletize`: A multi-file example skill fixture that teaches any AI agent to convert a raw skill directory into a publishable Skillet npm package; includes a `resources/` subfolder with template files the skill can scaffold

### Modified Capabilities

- `monorepo-setup`: Fixture directory renamed from `fixtures/hello-skill` to `fixtures/skilletize`; all spec scenarios referencing the old path updated
- `test-infrastructure`: Test fixtures path constant and all test files updated from `hello-skill` to `skilletize`

## Impact

- `packages/core/fixtures/hello-skill/` — deleted; replaced by `fixtures/skilletize/`
- `packages/core/bin/cli.js` — path updated
- `packages/core/test/` — all three layers (unit, integration, e2e) reference the fixture by path; all updated
- `openspec/specs/monorepo-setup/spec.md` and `openspec/specs/test-infrastructure/spec.md` — delta specs added for renamed fixture
- No public API changes; `@skillet-cli/core` exports are untouched
