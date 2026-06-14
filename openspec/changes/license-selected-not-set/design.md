## Context

`executeScaffold` in `packages/create/src/scaffold.ts` uses a two-step approach:

1. `npm init -y` — creates `package.json` with `"license": "ISC"` and `"type": "commonjs"` (npm's hardcoded defaults).
2. `npm pkg set license=MIT type=module` (among other fields) — intended to overwrite these defaults.

Step 2 should overwrite both fields, but the root issue is architectural: the wrong values are written first and then corrected. Any failure, truncation, or quoting issue in the `npm pkg set` call leaves the npm defaults in place. Additionally, during the window between step 1 and step 2 completing, an observer (or a partial failure) would see `"type": "commonjs"` — not `"module"`.

`npm init` supports both `--init-license=<value>` and `--init-type=<value>` CLI flags that write these fields directly into the generated `package.json` at creation time, avoiding the defaults-then-overwrite problem entirely.

The existing integration test (`test/integration/scaffold.test.ts`) skips `npm init` by pre-seeding a `package.json` and only verifies `bin/cli.js` content — it never checks what the `license` or `type` fields in `package.json` end up being after a full scaffold run.

## Goals / Non-Goals

**Goals:**
- Ensure the user-selected license is written to `package.json` at `npm init` time via `--init-license`, making the ISC default unreachable.
- Ensure `"type": "module"` is written to `package.json` at `npm init` time via `--init-type=module`, making the `commonjs` default unreachable.
- Add a regression test that actually reads the `license` and `type` fields from `package.json` after `executeScaffold` completes from a fresh state (no pre-existing `package.json`).
- Update the unit test that checks the `npm init` command string to expect both `--init-license=MIT` and `--init-type=module`.

**Non-Goals:**
- Removing the `license=${config.license}` or `type=module` entries from `pkgSetArgs` (belt-and-suspenders is fine).
- Changing the license prompt from `input` to a `select` dropdown.
- Fixing `runSync`'s shell quoting more broadly.
- Reading `license` from an existing `package.json` in `detect.ts`.
- Any changes to `packages/core/package.json`.
- Spec updates to `skilletize-wizard/spec.md` beyond a delta tightening the license and type field value requirements.

## Decisions

### Decision: Pass both `--init-license` and `--init-type=module` to `npm init -y`

`npm init -y` accepts `--init-license=<value>` and `--init-type=<value>` as CLI flags. Passing both means the generated `package.json` starts with `"license": "MIT"` (or whatever the user selected) and `"type": "module"` from the very first write, so the subsequent `npm pkg set` calls for these fields become no-op redundancies rather than the sole mechanisms of correctness.

**Alternative considered:** Remove the `npm init -y` step and write `package.json` directly via `fs.writeFile` with all fields pre-populated. Rejected — the existing spec explicitly requires using `npm init -y` and `npm pkg set` as the mechanism; direct file writes are out of scope.

**Alternative considered:** Fix `runSync` shell quoting to guarantee the `npm pkg set` call always succeeds. Rejected — that's a broader change with more surface area, and the `--init-license` / `--init-type` flags are a simpler, more targeted fix at the source.

### Decision: Regression test runs from a fresh directory (no pre-existing `package.json`)

The existing integration tests pre-seed a `package.json` to skip `npm init`. The regression test must NOT pre-seed one — it needs `npm init -y --init-license=MIT --init-type=module` to run, then verifies the resulting `package.json` has `"license": "MIT"` and `"type": "module"`. This is the only way to catch a regression in either flag.

### Decision: Update unit test for npm init command string

The unit test `'runs npm init -y when no package.json exists'` asserts the presence of an `init` call but does not check for `--init-license` or `--init-type`. After the fix, add assertions that the command string includes both `--init-license=MIT` (or the configured license value) and `--init-type=module` to prevent future regressions at the command-construction level.

## Risks / Trade-offs

- `--init-license` and `--init-type` flag availability: Both are supported since npm 6. All supported Node.js ≥24 environments ship npm ≥10, so this is safe.
- The regression test runs real `npm` commands and will be slow (~30–60 s). Mark with a 90 000 ms timeout, consistent with existing integration tests.
