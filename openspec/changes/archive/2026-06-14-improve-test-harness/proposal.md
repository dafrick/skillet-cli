## Why

Three runs of the manual E2E test harness (2026-06-06) revealed six recurring friction points that add noise to every session, soften failure grades, and obscure the product behavior under test. Left unaddressed, these issues undermine the harness's core purpose: producing clean, reproducible signal about `create-skillet` and `@skillet-cli/core`.

## What Changes

- **Add Git to container setup** — `make test-start` installs Node 24 but not Git; every run required an off-task `apt-get install -y git` before the test user could do anything
- **Add `make prep-run` target** — guides pre-clone the repo into the running container before handing off to the test user; cloning is environment setup, not product behavior, and should not appear in the test user's LOG
- **Separate agent roles** — when the test user is a coding agent, they should run as an isolated sub-agent with no prior session context; a single agent playing both roles leaks workaround knowledge from run to run (ISS-001 was a hard fail for a first-time user, but was graded 🔶 because the agent remembered the fix from an earlier run)
- **Fix LOG.md template structure** — the format-examples block sits inside an HTML comment that extends into the append region; in run 1, actual log entries landed inside the comment and were invisible to the guide
- **Make pre-session re-inspection mandatory** — all three candidate repos were misclassified in TEST-MATRIX; the README says "inspect the repo," but it is advisory; guides must confirm the tier before `make test-start` and update the matrix entry if it is wrong
- **Fix `wait-for-text.sh` path in AGENT-SUPPLEMENT** — the supplement documents the script as `./scripts/wait-for-text.sh`; this path fails when the agent's working directory is not `test-manual/`; the supplement must use a path that works regardless of where the agent is invoked from

## Capabilities

### New Capabilities

- `harness-prep-run`: A `make prep-run` Makefile target that clones a specified repository into the running test container, with documentation in the README guiding the guide to run it as part of session setup

### Modified Capabilities

- `manual-test-harness`: Updates to existing requirements for `test-start` (add Git install), the guide's before-you-start checklist (pre-clone step, mandatory re-inspection), role separation guidance for coding-agent test users, LOG template structure, and AGENT-SUPPLEMENT script path reference

## Impact

- `test-manual/Makefile` — add `git` to the `test-start` apt-get block; add new `prep-run` target
- `test-manual/README.md` — add `prep-run` step to before-you-start checklist; make tier re-inspection mandatory; add role-separation guidance for coding-agent sessions
- `test-manual/templates/LOG.md.template` — restructure format examples so they are outside the append region and do not sit inside an open HTML comment
- `test-manual/AGENT-SUPPLEMENT.md` — replace relative `./scripts/wait-for-text.sh` path with a note that agents must resolve the script path relative to their working directory, or use the absolute path
- `openspec/specs/manual-test-harness/spec.md` — update affected requirements
