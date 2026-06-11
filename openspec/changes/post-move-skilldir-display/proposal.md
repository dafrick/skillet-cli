## Why

The `create-skillet` wizard shows `skillDir: ./` in its pre-confirmation summary, then silently changes it to `./skill/` during `setupSkillDir`. The user sees no acknowledgment of this update, leaving them with a wrong mental model of their package configuration.

## What Changes

- Add a single output line — `skillDir updated to: ./skill/` — printed by `setupSkillDir` immediately after files are moved and before `npm pkg set` runs.
- Add a unit test asserting that line appears in stdout after a successful move.
- Add a spec scenario requiring the wizard to display the updated `skillDir` value after a move.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skilletize-wizard`: Add a requirement that the wizard displays the updated `skillDir` value after the skill directory move completes.

## Impact

- `packages/create/src/skill-dir.ts` — one `process.stdout.write(...)` call added inside `setupSkillDir`, matching the API used by all other move-phase output lines.
- `packages/create/test/unit/skill-dir-post-move.test.ts` — new test added with a `vi.spyOn(process.stdout, 'write')` spy and an assertion that the confirmation line was written.
- `openspec/changes/post-move-skilldir-display/specs/skilletize-wizard/spec.md` — delta spec adding the missing scenario.
