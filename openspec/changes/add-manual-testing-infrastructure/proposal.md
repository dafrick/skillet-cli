## Why

There is no way to validate that `create-skillet` and `@skillet-cli/core` work correctly against real-world skill repos. The only existing tests exercise the codebase internally; nobody has systematically run through the full skilletize-and-install loop against actual public repos at different complexity levels. Adding a manual testing harness gives any developer or coding agent a repeatable, documented process for doing exactly that — and produces a structured record of what was found.

## What Changes

- Add `test-manual/` at the repo root: a self-contained harness for running manual end-to-end tests against real GitHub skill repos
- `test-manual/README.md` — step-by-step guide for running a test session, including a Tmux reference section for coding agents driving the interactive `create-skillet` wizard
- `test-manual/TEST-MATRIX.md` — two sections: (1) a catalog of candidate repos with tier and notes, (2) a running log of completed test runs with date, repo, tier, environment, and outcome
- `test-manual/templates/TEST-RUN.md.template` — per-repo test plan template; covers tier identification, happy-path steps, edge cases, UX quality observations, and issue filing
- `test-manual/templates/LOG.md.template` — append-only session narrative template; captures timestamped free-form entries of tester activity for later traceability and issue reproduction
- `test-manual/templates/ISSUE.md.template` — structured issue documentation template (description, reproduce steps, how encountered, why bad, impact, severity, workaround)
- `test-manual/scripts/wait-for-text.sh` — shell script that polls a tmux pane for a regex pattern with a configurable timeout; adapted from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff/blob/main/skills/tmux/SKILL.md) for pacing interactions with `@inquirer/prompts`
- `test-manual/Makefile` — `test-start` and `test-teardown` targets; starts a bare `ubuntu:24.04` container in the background and opens a host-side tmux session whose shell lives inside the container; no custom Dockerfile required
- `test-manual/tmp/` — gitignored; ephemeral repo clones land here during a test run, are never committed

## Capabilities

### New Capabilities

- `manual-test-harness`: The `test-manual/` directory — README, TEST-MATRIX, templates, helper script, and Makefile — that defines the repeatable manual testing process for validating skillet and create-skillet against real-world skill repos

### Modified Capabilities

- `monorepo-setup`: Root `.gitignore` updated to exclude `test-manual/tmp/*`

## Impact

- **New files**: `test-manual/README.md`, `test-manual/TEST-MATRIX.md`, `test-manual/templates/TEST-RUN.md.template`, `test-manual/templates/LOG.md.template`, `test-manual/templates/ISSUE.md.template`, `test-manual/scripts/wait-for-text.sh`, `test-manual/Makefile`, `test-manual/tmp/.gitkeep`
- **Modified**: `.gitignore` (add `test-manual/tmp/*`)
- **Dependencies**: Docker and tmux required at runtime; no new npm dependencies
- **No breaking changes** — entirely additive; no existing packages or workflows affected
