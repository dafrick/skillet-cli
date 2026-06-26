## Why

`create-skillet` is designed as a one-shot scaffolding wizard, but skill authors inevitably need to evolve their packages after the initial publish — adding directories, restructuring, or iterating on content. There is currently no guidance for this workflow, re-running the wizard has undocumented footguns (name/version/description/author reset, `bin/cli.js` overwrite), and a code bug causes `.npmignore` to be unconditionally overwritten on every scaffold run, destroying any customizations the author made.

## What Changes

- **Bug fix**: Guard the `.npmignore` write in `executeScaffold` with an existence check — skip the write if `.npmignore` already exists, preventing destruction of author-added entries.
- **Completion block**: Add a "To expand your skill" guidance block to the wizard's completion output in `run.ts`, covering the three expansion scenarios and warning about re-run footguns.
- **README section**: Add an "Expanding your skill" section to `packages/create/README.md` documenting the three expansion scenarios, the re-run footguns, and `create-skillet check` as a verification tool.

## Capabilities

### New Capabilities

- `scaffold-npmignore-guard`: The scaffold step SHALL NOT overwrite `.npmignore` if one already exists in the target directory.
- `wizard-expansion-guidance`: The wizard completion block SHALL include a "To expand your skill" section covering three post-publish expansion scenarios and re-run warnings.

### Modified Capabilities

- `skilletize-wizard`: The "Wizard displays next steps on completion" requirement is amended to include expansion guidance after the standard next-steps block.

## Impact

- `packages/create/src/scaffold.ts` — add existence guard before `.npmignore` write
- `packages/create/src/run.ts` — add expansion guidance block to completion output
- `packages/create/README.md` — add "Expanding your skill" section
- `packages/create/src/scaffold.test.ts` — add test cases for the existence guard
- No changes to `packages/core` or any other package
- No public API or CLI surface changes
- No new commands or flags
