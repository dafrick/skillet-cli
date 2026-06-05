# Manual E2E Test Harness

## Overview

This harness provides manual end-to-end testing for `create-skillet` and `@skillet-cli/core` against real-world skill repos. It exercises the full skilletize-and-install loop — from running the `create-skillet` wizard through packaging and installing the resulting skill — using public repos that represent a range of complexity levels (T1–T5).

**Who uses this:** Developers and coding agents who want to validate that the full skilletize-and-install loop works correctly against repos of varying structure, nesting depth, and file layout.

---

## Prerequisites

- **Docker** — runs the isolated test container
- **tmux** — provides the interactive session inside the container

> No Node.js is required on the host. Node is installed inside the container as part of the test setup.

---

## Running a Test

### Quick start

1. `make test-start` — builds and starts the container, then opens a tmux session inside it
2. Run through the test protocol (see below)
3. `make test-teardown` — stops the container and removes it

### Run folder layout

Each test run produces a folder at:

```
test-manual/tmp/YYYY-MM-DD-<repo-slug>/
```

That folder contains:

| File / Dir | Purpose |
|------------|---------|
| `LOG.md` | Append-only running narrative of the session |
| `TEST-RUN.md` | Structured pass/fail record for each protocol step |
| `issues/` | One `ISS-NNN.md` file per issue found |

---

## Test Protocol

### Before you start

Choose which agent environment you are testing skill installation into (e.g., Claude Code, GitHub Copilot CLI) and record it in the `env:` field of your `TEST-RUN.md`. The infrastructure does not prescribe which environment to use — vary across runs for broader coverage.

### Continue-despite-failures guideline

When a step fails or behaves unexpectedly, attempt to work around it, document the workaround in `LOG.md`, and continue the session rather than stopping. File issues for later triage. The goal is to complete as much of the protocol as possible.

### Failure taxonomy

| Symbol | Meaning |
|--------|---------|
| ✅ Pass | Worked correctly with the npm README alone; UX clear and defaults sensible |
| 🟡 Soft fail — docs gap | Worked but required consulting the GitHub README |
| 🟠 Soft fail — UX issue | Worked functionally but UX was confusing |
| 🔴 Hard fail | Threw an error or could not be completed even with workarounds |
| 🔵 N/A | Step not applicable to this tier or repo |

### Steps

**Step 1 — Identify the tier**

Clone the repo into `test-manual/tmp/YYYY-MM-DD-<repo-slug>/`. Identify the tier (T1–T5) based on the number of SKILL.md files and their nesting depth. Record the tier in `TEST-RUN.md`.

**Step 2 — Bootstrap Node**

Follow ONLY the npm README for `create-skillet`. If any step requires you to consult the GitHub README to proceed, record a 🟡 docs-gap soft fail. This constraint is not setup overhead — it IS the test. The npm README should be self-sufficient for a first-time user.

**Step 3 — Run create-skillet**

Run `npx create-skillet` (or `npm init skillet`) and navigate the wizard. Record each prompt and your response in `LOG.md`.

**Step 4 — Verify output**

Inspect the output directory. Confirm it looks correct for the tier: SKILL.md present, supporting files in the expected locations, no unexpected omissions or extras.

**Step 5 — Install skill**

Run `npm pack` in the skilletized directory to produce a tarball. Then, from a separate working directory, run `npm install <tarball>`. This tests the full install path without requiring a real npm publish.

**Step 6 — Verify skill placement**

Confirm skill files landed in the correct location within the target environment. Record the actual path and whether it matches the expected placement.

**Step 7 — Document issues**

For each issue found during the session, create `ISS-NNN.md` in `issues/` and reference it in the `LOG.md` entry that prompted it (e.g., `→ ISS-001`).

---

## Tmux Reference (for coding agents)

### Private socket setup

Always use a private tmux socket so agent sessions do not pollute the developer's personal tmux server:

```bash
SOCKET="${TMPDIR:-/tmp}/claude-tmux-sockets/skillet.sock"
```

All tmux commands MUST pass `-S "$SOCKET"`.

### Sending input

Always use `-l` (literal mode) to prevent shell expansion. Because `-l` makes all arguments literal, send Enter as a separate non-literal call:

```bash
# Send literal text, then submit with Enter
tmux -S "$SOCKET" send-keys -t skillet-test -l "npx create-skillet"
tmux -S "$SOCKET" send-keys -t skillet-test Enter
```

### Reading output

Always use `-J` (joins wrapped lines) and `-S -200` (200 lines of scrollback):

```bash
tmux -S "$SOCKET" capture-pane -p -J -S -200 -t skillet-test
```

`-J` prevents garbled output when parsing multi-line wizard prompts. `-S -200` ensures prompt text is not lost in scrollback.

### Waiting for a prompt

Use `wait-for-text.sh` to block until expected text appears:

```bash
./scripts/wait-for-text.sh -S "$SOCKET" -t skillet-test -p "Which skill" -T 15
```

### `@inquirer/prompts` key sequences

| Action | Key |
|--------|-----|
| Navigate list | `Up` / `Down` |
| Select checkbox item | `Space` |
| Confirm / accept default | `Enter` |
| Clear a text field | `C-u` (Ctrl+U) |
| Cancel | `C-c` (Ctrl+C) |

### Cleanup

```bash
tmux -S "$SOCKET" kill-session -t skillet-test
docker rm -f skillet-test-container
```

---

## Keeping the Log

`LOG.md` is the running narrative of what happened during a session. It is strictly **append-only** — never edit or delete prior entries. Each entry is prefixed with `HH:MM`:

```
14:03 Ran `npx create-skillet`. Wizard launched successfully.
14:05 Wizard prompted for output directory — default was blank. → ISS-001
```

When you file an issue, reference its identifier in the log entry that prompted it.

`LOG.md` is distinct from `TEST-RUN.md`: the log captures the unstructured narrative of what happened; the test run template records structured pass/fail against each protocol step.

---

## Documenting Issues

Issue files are named `ISS-001.md`, `ISS-002.md`, etc. — sequential, zero-padded to three digits — and live in `tmp/<run>/issues/`.

When you create one:
- Add a reference in the `LOG.md` entry that prompted it (e.g., `→ ISS-001`)
- Make the issue file self-contained: a developer reading it should be able to understand, reproduce, and assess the issue without reading the session log

A typical issue file covers: what was observed, what was expected, the step it occurred in, and any workaround used during the session.
