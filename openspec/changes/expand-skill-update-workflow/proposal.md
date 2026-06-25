## Why

Skill authors who expand their package after initial publish — adding new directories, restructuring, or updating `skillet.skillDir` — have no guidance on what to do next and risk silently losing `.npmignore` customizations if they re-run `create-skillet`. The tool is safe to re-run (mostly), but authors don't know that, and the one unsafe part (`.npmignore` always-overwrite) is a footgun that can discard exclusions the author set up via `create-skillet check`.

## What Changes

- **Fix `.npmignore` overwrite on scaffold**: the scaffold step SHALL write `.npmignore` only when it does not already exist. This preserves exclusions the author added via `create-skillet check` interactive triage.
- **Add "Expanding your skill" to the wizard completion block**: after the existing "Next steps" output, a brief "To expand your skill" section explains what re-running covers, what it doesn't touch, and how to add new directories to `files`.
- **Add "Expanding your skill" to `packages/create/README.md`**: a new reference section covering the post-publish lifecycle: adding directories to `files`, re-running `create-skillet` safely, and using `create-skillet check` to verify the tarball.

## Capabilities

### New Capabilities

- `skill-expansion-guidance`: Post-publish lifecycle guidance for skill authors — when and how to expand the published package after the initial scaffold run.

### Modified Capabilities

- `skilletize-wizard`: `.npmignore` is written conditionally (only if absent) during scaffold; the wizard completion block gains a "To expand your skill" section.

## Impact

- `packages/create/src/scaffold.ts`: change `.npmignore` write to conditional
- `packages/create/src/run.ts`: add "To expand your skill" output to completion block
- `packages/create/README.md`: add "Expanding your skill" section
- Specs: new `specs/skill-expansion-guidance/spec.md`; updated `specs/skilletize-wizard/spec.md` (delta)
