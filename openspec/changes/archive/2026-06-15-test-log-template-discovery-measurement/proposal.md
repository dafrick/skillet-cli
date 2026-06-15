## Why

The manual test LOG template pre-fills `create-skillet-version:` in the guide-handed frontmatter, which reveals the tool name to the test user before Step 2 (bootstrapping from the npm README alone). This makes it impossible to measure whether the test user can independently discover and invoke the right tool — the core observable of that step.

## What Changes

- Remove `create-skillet-version:` from the guide-prefilled frontmatter block in `test-manual/templates/LOG.md.template`
- Add a post-session block after the append region in `LOG.md.template` where the tester records `create-skillet-version:` after they have discovered and used the tool
- Update `test-manual/README.md` Step 6 to remove `create-skillet-version` from the guide's pre-fill field list and explain why it is intentionally excluded
- Update `openspec/specs/manual-test-harness/spec.md` to reflect the new template structure and add a scenario verifying the field is blank at handoff

## Capabilities

### New Capabilities

<!-- None: this change modifies existing test harness behavior only -->

### Modified Capabilities

- `manual-test-harness`: The LOG.md.template requirement changes — `create-skillet-version` moves from the guide-prefilled header to a post-session block that the tester fills in after the session. The spec gains a new scenario asserting the field is blank at handoff.

## Impact

- `test-manual/templates/LOG.md.template` — template file change
- `test-manual/README.md` — guide instruction change (Step 6)
- `openspec/specs/manual-test-harness/spec.md` — spec requirement and scenario change
- `test-manual/templates/TEST-RUN.md.template` is NOT affected (guide-only document; the test user never sees it)
