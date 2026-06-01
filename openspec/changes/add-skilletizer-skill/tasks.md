## 0. Decouple tests from fixture content

- [ ] 0.1 Refactor `packages/core/test/unit/normalize.test.ts`: replace hardcoded `name`, `description`, and `body.toContain(...)` assertions with structural assertions (e.g. `expect(result.name).toBeTypeOf('string')` and not empty) — the test verifies parsing works, not that a specific fixture says specific words
- [ ] 0.2 Refactor `packages/core/test/integration/install.test.ts`: derive the expected install path segment from `normalizeSkill(fixtureDir).name` rather than a hardcoded string, so `skills/${name}/` is computed at runtime
- [ ] 0.3 Refactor `packages/core/test/integration/manifest.test.ts`: same — derive expected `name` from `normalizeSkill()` output rather than a string literal
- [ ] 0.4 Refactor `packages/core/test/e2e/install.test.ts`: derive the expected path segment (currently hard-coded as `hello-skill`) from the normalized fixture name at test setup time, not as a string literal

## 1. Create the Skilletize fixture

- [ ] 1.1 Create `packages/core/fixtures/skilletize/SKILL.md` with valid `name: skilletize` frontmatter, no adapter-specific syntax, and generic skill content instructing any AI agent to scaffold a Skillet npm package from an existing skill directory
- [ ] 1.2 Create `packages/core/fixtures/skilletize/resources/package.json.template` with placeholder `name`, `version`, `description`, `bin` pointing to `./bin/cli.js`, and `dependencies` containing `@skillet-cli/core`
- [ ] 1.3 Create `packages/core/fixtures/skilletize/resources/bin/cli.js` as a complete ESM entry point with shebang, `import { run } from '@skillet-cli/core'`, and a `run({ skillDir, pkg })` call

## 2. Replace the hello-skill fixture

- [ ] 2.1 Delete `packages/core/fixtures/hello-skill/` and all its contents
- [ ] 2.2 Update `packages/core/bin/cli.js` to resolve `skillDir` to `fixtures/skilletize` instead of `fixtures/hello-skill`
- [ ] 2.3 Update `packages/core/package.json` `bin` field: rename the binary key from `"hello-skill"` to `"skilletize"`

## 3. Update test fixture path references

- [ ] 3.1 Update `packages/core/test/unit/normalize.test.ts`: change fixture path constant from `fixtures/hello-skill` to `fixtures/skilletize` (assertions are already fixture-agnostic after task 0.1)
- [ ] 3.2 Update `packages/core/test/integration/install.test.ts`: change fixture path constant from `fixtures/hello-skill` to `fixtures/skilletize`
- [ ] 3.3 Update `packages/core/test/integration/manifest.test.ts`: change fixture path constant from `fixtures/hello-skill` to `fixtures/skilletize`
- [ ] 3.4 Update `packages/core/test/e2e/install.test.ts`: change fixture path constant from `fixtures/hello-skill` to `fixtures/skilletize` (path segments in assertions are already derived after task 0.4)

## 4. Update specs

- [ ] 4.1 Patch the two affected scenarios in `openspec/specs/monorepo-setup/spec.md`: update the "Test fixtures live inside the package" requirement to reference `fixtures/skilletize/` and add a statement that the `bin` field in `packages/core/package.json` SHALL name the binary `"skilletize"`
- [ ] 4.2 Patch the two affected scenarios in `openspec/specs/test-infrastructure/spec.md`: update the integration "Fresh install writes correct files" scenario path and the E2E "Non-TTY install" scenario path and THEN clause

## 5. Verify

- [ ] 5.1 Run `grep -r "hello-skill" packages/` to confirm no remaining references
- [ ] 5.2 Run `pnpm --filter @skillet-cli/core test:unit` and confirm all unit tests pass
- [ ] 5.3 Run `pnpm --filter @skillet-cli/core test:integration` and confirm all integration tests pass
- [ ] 5.4 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test:e2e` and confirm all e2e tests pass
