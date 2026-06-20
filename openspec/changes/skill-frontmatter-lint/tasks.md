## 1. Tests — core lint function (TDD red phase)

- [ ] 1.1 Add unit tests for `lintSkillFrontmatter` — returns `true` for content starting with `---\n`
- [ ] 1.2 Add unit tests for `lintSkillFrontmatter` — returns `true` for content starting with `---\r\n` (CRLF)
- [ ] 1.3 Add unit tests for `lintSkillFrontmatter` — returns `false` for content with leading blank line before `---`
- [ ] 1.4 Add unit tests for `lintSkillFrontmatter` — returns `false` for content with H1 title before `---`
- [ ] 1.5 Add unit tests for `lintSkillFrontmatter` — returns `false` for content with no frontmatter delimiter at all
- [ ] 1.6 Add unit test for `lintSkillFrontmatter` — returns `false` for empty string
- [ ] 1.7 Add unit test verifying `lintSkillFrontmatter` is importable from `@skillet-cli/core`
- [ ] 1.8 Run tests and confirm all new tests fail

## 2. Implement core lint function (TDD green phase)

- [ ] 2.1 Create `packages/core/src/lint.ts` exporting `lintSkillFrontmatter(content: string): boolean` — returns `true` iff content starts with `---\n` or `---\r\n`
- [ ] 2.2 Export `lintSkillFrontmatter` from `packages/core/src/index.ts`
- [ ] 2.3 Run core unit tests and confirm all pass

## 3. Tests — create-skillet check integration (TDD red phase)

- [ ] 3.1 Add unit/integration test: `runCheck` emits no frontmatter warning when all SKILL.md files start with `---`
- [ ] 3.2 Add unit/integration test: `runCheck` in non-interactive mode emits warning message and exits 0 when a SKILL.md does not start with `---`
- [ ] 3.3 Add unit/integration test: `runCheck` in interactive mode prompts user to fix when frontmatter violation found
- [ ] 3.4 Add unit/integration test: when user accepts fix, SKILL.md is rewritten with `---` as first line and all original frontmatter fields preserved
- [ ] 3.5 Add unit/integration test: when user declines fix, SKILL.md is not modified
- [ ] 3.6 Run tests and confirm new check tests fail

## 4. Implement create-skillet check lint (TDD green phase)

- [ ] 4.1 In `packages/create/src/check.ts`, add a lint step in `runCheck()` that reads each SKILL.md file and calls `lintSkillFrontmatter`
- [ ] 4.2 In non-interactive mode, emit the violation warning to stdout and continue (exit 0)
- [ ] 4.3 In interactive mode, use `confirm()` to ask the user whether to fix the frontmatter position
- [ ] 4.4 Implement the fix: read SKILL.md with gray-matter, rewrite file as `---\n<re-serialized fields>\n---\n<body>`
- [ ] 4.5 After fix, inform the user the file was rewritten and recommend reviewing it
- [ ] 4.6 Run create-skillet tests and confirm all pass

## 5. Tests — skillet install warning (TDD red phase)

- [ ] 5.1 Add unit/integration test: install emits no frontmatter warning when SKILL.md starts with `---`
- [ ] 5.2 Add unit/integration test: install emits `⚠ <name>: SKILL.md frontmatter...` warning to stderr when SKILL.md does not start with `---`, and install completes successfully
- [ ] 5.3 Run install tests and confirm new tests fail

## 6. Implement skillet install warning (TDD green phase)

- [ ] 6.1 In `packages/core/src/install.ts`, after reading/normalizing the skill, call `lintSkillFrontmatter` on the raw SKILL.md content
- [ ] 6.2 If lint returns `false`, write the warning line to stderr naming the skill
- [ ] 6.3 Run all install tests and confirm all pass

## 7. Verify

- [ ] 7.1 Run full test suite (`pnpm test`) and confirm all tests pass
- [ ] 7.2 Run `pnpm build` and confirm no TypeScript errors
