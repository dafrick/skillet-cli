## 1. Create the Skilletize fixture

- [ ] 1.1 Create `packages/core/fixtures/skilletize/SKILL.md` with valid `name: skilletize` frontmatter, no adapter-specific syntax, and generic skill content instructing any AI agent to scaffold a Skillet npm package from an existing skill directory
- [ ] 1.2 Create `packages/core/fixtures/skilletize/resources/package.json.template` with placeholder `name`, `version`, `description`, `bin` pointing to `./bin/cli.js`, and `dependencies` containing `@skillet-cli/core`
- [ ] 1.3 Create `packages/core/fixtures/skilletize/resources/bin/cli.js` as a complete ESM entry point with shebang, `import { run } from '@skillet-cli/core'`, and a `run({ skillDir, pkg })` call

## 2. Replace the hello-skill fixture

- [ ] 2.1 Delete `packages/core/fixtures/hello-skill/` and all its contents
- [ ] 2.2 Update `packages/core/bin/cli.js` to resolve `skillDir` to `fixtures/skilletize` instead of `fixtures/hello-skill`

## 3. Update test references

- [ ] 3.1 Update `packages/core/test/unit/normalize.test.ts`: change fixture path constant from `fixtures/hello-skill` to `fixtures/skilletize` and update the expected `name` assertion from `'hello-skill'` to `'skilletize'`
- [ ] 3.2 Update `packages/core/test/integration/install.test.ts`: change fixture path constant from `fixtures/hello-skill` to `fixtures/skilletize`
- [ ] 3.3 Update `packages/core/test/integration/manifest.test.ts`: change fixture path constant from `fixtures/hello-skill` to `fixtures/skilletize`
- [ ] 3.4 Update `packages/core/test/e2e/install.test.ts`: change all hard-coded `hello-skill` path segments to `skilletize`

## 4. Update specs

- [ ] 4.1 Apply delta to `openspec/specs/monorepo-setup/spec.md`: update the "Test fixtures live inside the package" requirement to reference `fixtures/skilletize/` instead of `fixtures/hello-skill/`
- [ ] 4.2 Apply delta to `openspec/specs/test-infrastructure/spec.md`: update the fresh-install and non-TTY install scenarios to reference `skilletize` instead of `hello-skill`

## 5. Verify

- [ ] 5.1 Run `grep -r "hello-skill" packages/` to confirm no remaining references
- [ ] 5.2 Run `pnpm --filter @skillet-cli/core test:unit` and confirm all unit tests pass
- [ ] 5.3 Run `pnpm --filter @skillet-cli/core test:integration` and confirm all integration tests pass
- [ ] 5.4 Run `pnpm --filter @skillet-cli/core build && pnpm --filter @skillet-cli/core test:e2e` and confirm all e2e tests pass
