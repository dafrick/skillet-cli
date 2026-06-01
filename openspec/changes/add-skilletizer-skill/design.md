## Context

`packages/core` ships a `bin/cli.js` that points to `fixtures/hello-skill/` as the skill to install when someone runs `npx @skillet-cli/core`. The fixture is also the shared test fixture across unit, integration, and e2e layers. It is the only concrete example of a skill directory in the repo.

The new `skilletize` fixture must serve three roles simultaneously:
1. **Example CLI demo** — what runs when someone tries out `@skillet-cli/core` directly
2. **Test fixture** — the canonical skill directory used by all test layers
3. **Realistic showcase** — a multi-file skill structure that authors can model their own packages after

## Goals / Non-Goals

**Goals:**
- Create a richer fixture that demonstrates multi-file skill structure (`SKILL.md` + `resources/`)
- Make the bundled demo actually useful: installing Skilletize gives the user a skill they can run to scaffold new Skillet packages
- Update all hard-coded references to `hello-skill` across tests, specs, and bin entry point
- Keep the fixture path stable after rename to avoid future churn (`fixtures/skilletize/`)

**Non-Goals:**
- Publishing `skilletize` as a standalone npm package (it lives inside `@skillet-cli/core` as the demo/fixture)
- Adding any new public API surface to `@skillet-cli/core`
- Supporting a live "run this init script" flow — resource files are templates the skill scaffolds, not executables

## Decisions

### Decision: Keep fixture inside `packages/core`, not a separate package

The fixture is the demo and the test fixture. Extracting it to a separate `packages/skilletize` package would split test dependencies across packages and complicate the CI matrix. Keeping it collocated means zero workspace changes and tests continue to import it via relative path.

Alternative: `examples/skilletize/` as a top-level directory. Rejected because it sits outside `packages/*` and is invisible to pnpm's workspace, meaning tests couldn't import it via the existing helper paths without an additional workspace declaration.

### Decision: `resources/` subfolder inside the fixture, not inline in `SKILL.md`

Template files (`package.json.template`, `bin/cli.js`) are real files the skill instructs the AI to copy or adapt. Storing them as fenced code blocks inside `SKILL.md` works but makes them harder to update and harder to reference by path. A `resources/` subfolder makes the multi-file structure obvious to authors studying the fixture.

Alternative: Embed everything in `SKILL.md`. Rejected — it defeats the goal of showcasing multi-file structure.

### Decision: Generic skill content, not Claude Code–specific

Skilletize is authored as a generic skill with no adapter-specific frontmatter or instructions. This maximises compatibility across all Skillet adapters (Claude Code, Copilot, generic agents) and keeps the fixture honest — it demonstrates what any skill author would write if they want broad reach. Claude Code users will still benefit from it; it just doesn't hardcode Claude Code–only syntax.

### Decision: Rename fixture directory (not create alongside)

Keeping `hello-skill` and adding `skilletize` alongside it leaves dead code and splits attention. A clean rename forces all references to update, which is the right forcing function to validate nothing was missed.

### Decision: Spec deltas, not full spec rewrites

`monorepo-setup` and `test-infrastructure` specs reference `hello-skill` in exact scenario text. These are delta specs (ADDED/CHANGED requirement sections) so the change produces minimal diffs to existing spec files rather than rewriting them wholesale.

## Risks / Trade-offs

[Tests break if any `hello-skill` path reference is missed] → Mitigation: grep the entire repo for `hello-skill` before marking implementation complete; CI will catch stragglers immediately.

[`SKILL.md` content quality] → Skilletize's instructions need to be genuinely useful (not just placeholder text) for the demo to have value. This requires careful skill authoring, not just scaffolding.

[Fixture used by normalize unit test which checks `name` and `description` frontmatter] → Tests will be refactored (task 0) to assert structural correctness rather than fixture-specific values, so no assertion literals need updating when the fixture content changes.

## Migration Plan

0. Decouple test assertions from fixture-specific values (refactor before renaming anything)
1. Create `packages/core/fixtures/skilletize/` with all new content
2. Delete `packages/core/fixtures/hello-skill/`; update `packages/core/bin/cli.js` fixture path; rename `bin` field in `packages/core/package.json` from `"hello-skill"` to `"skilletize"`
3. Update fixture path constants in test files: `normalize.test.ts`, `install.test.ts` (integration), `manifest.test.ts`, `install.test.ts` (e2e)
4. Delta specs for `monorepo-setup` and `test-infrastructure` — **already done in this PR**
5. Run full test suite to confirm no missed references

Rollback: revert the rename; no data migration or external state involved.
