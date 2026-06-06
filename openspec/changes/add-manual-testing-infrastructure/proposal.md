## Why

There is no way to validate that `create-skillet` and `@skillet-cli/core` work correctly against real-world skill repos. The only existing tests exercise the codebase internally; nobody has systematically run through the full skilletize-and-install loop against actual public repos at different complexity levels. Adding a manual testing harness gives any developer or coding agent a repeatable, documented process for doing exactly that — and produces a structured record of what was found.

## What Changes

- Add `test-manual/` at the repo root: a self-contained harness for running manual end-to-end tests against real GitHub skill repos
- `test-manual/README.md` — guide orientation: role definitions (Guide vs Test user), tier reference (T1–T5 plus O), before-you-start checklist, session flow, run-folder layout, log-keeping and issue-filing guidance
- `test-manual/AGENT-SUPPLEMENT.md` — tmux reference for coding-agent test users (private socket, send-keys, capture-pane, wait-for-text.sh, `@inquirer/prompts` key sequences); separated from README so human testers are not confused by agent-specific content
- `test-manual/TEST-MATRIX.md` — two sections: (1) a catalog of candidate repos with tier and notes, (2) a running log of completed test runs with date, repo, tier, environment, and outcome; consultation note at top directing guides to check coverage gaps before starting
- `test-manual/templates/TASK.md.template` — the document the Guide customizes per run and hands to the test user; two tasks (Package the skills → Install the skills) in user-domain language; no expected paths, failure taxonomy, or commands
- `test-manual/templates/TEST-RUN.md.template` — the Guide's grading sheet: session metadata (repo, tier, env, **version**, date, tester), six-grade failure taxonomy (adds 🔶 Mid fail between 🟠 and 🔴), continuous issue-filing note, six-step happy-path protocol in guide-observation language with expected-paths table at Step 6, soft-fail log, issues list, UX quality observations; no edge cases section
- `test-manual/templates/LOG.md.template` — the test user's running narrative: append-only, first-person format examples; the Guide consults it to cross-reference with TEST-RUN grading and surface issues the test user noted but did not flag explicitly; header includes `version:` field alongside repo, tier, env, date, tester, and Docker base image
- `test-manual/templates/ISSUE.md.template` — structured issue documentation: Description, Steps to reproduce, Expected result, Actual result, How encountered, Why bad/user impact, Severity (critical/high/medium/low), Workaround
- `test-manual/scripts/wait-for-text.sh` — shell script that polls a tmux pane for a regex pattern with a configurable timeout; adapted from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff/blob/main/skills/tmux/SKILL.md) for pacing interactions with `@inquirer/prompts`
- `test-manual/Makefile` — `test-start`, `test-teardown`, and `init-run` targets; `init-run` scaffolds a run folder under `tmp/` by copying all templates and creating `issues/`
- `test-manual/tmp/` — gitignored; ephemeral repo clones land here during a test run, are never committed

## Capabilities

### New Capabilities

- `manual-test-harness`: The `test-manual/` directory — README, AGENT-SUPPLEMENT, TEST-MATRIX, templates (TASK, TEST-RUN, LOG, ISSUE), helper script, and Makefile — that defines the repeatable manual testing process for validating skillet and create-skillet against real-world skill repos

### Modified Capabilities

- `monorepo-setup`: Root `.gitignore` updated to exclude `test-manual/tmp/*`

## Impact

- **New files**: `test-manual/README.md`, `test-manual/AGENT-SUPPLEMENT.md`, `test-manual/TEST-MATRIX.md`, `test-manual/templates/TASK.md.template`, `test-manual/templates/TEST-RUN.md.template`, `test-manual/templates/LOG.md.template`, `test-manual/templates/ISSUE.md.template`, `test-manual/scripts/wait-for-text.sh`, `test-manual/Makefile`, `test-manual/tmp/.gitkeep`
- **Modified**: `.gitignore` (add `test-manual/tmp/*`)
- **Dependencies**: Docker and tmux required at runtime; no new npm dependencies
- **No breaking changes** — entirely additive; no existing packages or workflows affected
