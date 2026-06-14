## Why

When `npm create skillet` runs the wizard, the user selects MIT as the license (the presented default), but the generated `package.json` ends up with `"license": "ISC"` — npm's own built-in default from `npm init -y`. Additionally, during scaffold execution, `"type": "commonjs"` appears transiently, even though the final `package.json` is expected to have `"type": "module"`. Both problems share the same root cause: `npm init -y` writes npm's built-in defaults (`ISC` and `commonjs`) first, and then `npm pkg set` is expected to overwrite them. If the overwrite fails or is observed mid-run, the wrong values appear. This breaks the promise shown in the NPM preview screen and violates user expectations set by the wizard prompts.

## What Changes

- Pass `--init-license=${config.license}` AND `--init-type=module` to the `npm init -y` call in `executeScaffold` so both the user-selected license and the correct module type are written from the start, before any `npm pkg set` runs.
- Add integration test assertions that verify the final `package.json` contains `"license": "MIT"` AND `"type": "module"` after `executeScaffold` completes from a fresh directory.
- Update the unit test that checks the `npm init` command string to expect both `--init-license=MIT` and `--init-type=module`.

## Capabilities

### New Capabilities

_(none — this is a bug fix, no new user-facing capability is introduced)_

### Modified Capabilities

- `skilletize-wizard`: The "All required fields are set" scenario already mandates `license` and `type` in the final `package.json`. The requirement is not changing, but the implementation must actually honor the user-selected license value and write the correct module type from the start. A delta spec is needed to tighten the scenario wording so it explicitly requires the selected license value and `"type": "module"` to appear in `package.json` — not npm's defaults.

## Impact

- `packages/create/src/scaffold.ts` — the `npm init` invocation gains `--init-license` and `--init-type` flags
- `packages/create/test/integration/scaffold.test.ts` — new assertions on `package.json` `license` and `type` fields
- `packages/create/test/unit/scaffold.test.ts` — unit test for the `npm init` command string must be updated to include `--init-license=MIT` and `--init-type=module`
