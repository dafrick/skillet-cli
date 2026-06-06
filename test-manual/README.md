# Manual E2E Test Harness

## Overview

This harness provides manual end-to-end testing for `create-skillet` and `@skillet-cli/core` against real-world skill repos. It exercises the full skilletize-and-install loop using public repos that represent a range of complexity levels (T1–T5).

---

## Roles

**Guide** — you. You set up the session, choose which repo and environment to test, observe and grade the test user's session, and produce the run documentation: `TEST-RUN.md`, `LOG.md`, and issue files. The test user does not see any harness documentation.

**Test user** — the person or coding agent performing the task. They receive only `TASK.md` (and `AGENT-SUPPLEMENT.md` if they are a coding agent). They have no access to this README, `TEST-RUN.md`, the failure taxonomy, or expected paths.

---

## Prerequisites

- **Docker** — runs the isolated test container
- **tmux** — provides the interactive session inside the container

> No Node.js is required on the host. `make test-start` installs Node 24 inside the container automatically.

---

## Tier Reference

Classify the repo before the session begins. Record the tier in `TEST-RUN.md`.

| Tier | Definition |
|------|------------|
| T1 | Single `SKILL.md`, no resources |
| T2 | Single skill + flat supporting files |
| T3 | Single skill + nested resources/scripts |
| T4 | Multiple `SKILL.md` files in subdirectories (multi-skill) |
| T5 | Multi-skill with scripts, templates, or deep nesting |
| O | Other — repo does not fit any tier above |

---

## Before You Start

1. Consult `TEST-MATRIX.md` to identify coverage gaps — prioritize untested tiers and environments.
2. Choose a candidate repo and a target agent environment (e.g., Claude Code, GitHub Copilot CLI).
3. Inspect the repo (on GitHub or by cloning locally) and identify its tier using the table above. This is pre-session work — the test user clones the repo themselves inside the container.
4. Run `make init-run REPO=<repo-slug>` to create the run folder and copy all templates.

   Use `org-repo` format for the slug (replace `/` with `-`). For example, `netresearch/agent-rules-skill` → `netresearch-agent-rules-skill`.

5. Open `tmp/YYYY-MM-DD-<repo-slug>/TASK.md` and fill in the repo URL, target environment, and any repo-specific context.
6. Pre-fill `LOG.md`'s frontmatter (`repo`, `tier`, `env`, `create-skillet-version`, `date`, `docker-image`) before handing it to the test user. The test user fills in `tester:` only and writes the append-only log entries.
7. If the test user is a coding agent, the run folder already contains `AGENT-SUPPLEMENT.md` — include it alongside `TASK.md` in the agent's context.

---

## Running the Session

1. `make test-start` — builds and starts the container, then opens a tmux session inside it
2. Hand the test user their files from `tmp/<run>/`:
   - **Human:** Share the file paths and open them for editing. The human runs commands in the container and writes `LOG.md` from a separate terminal on the host.
   - **Coding agent:** Provide `TASK.md`, `LOG.md`, and `AGENT-SUPPLEMENT.md` as context at the start of the agent's session.
3. Observe and grade the session in real time using `TEST-RUN.md`; consult `LOG.md` to cross-reference the test user's narrative.
   - **Coding agent:** `tmux -S "$(SOCKET)" attach -t $(SESSION)` to watch.
   - **Human:** The test user runs commands inside the container; the guide observes via a second `docker exec -it $(CONTAINER) bash` session or by sitting alongside.
4. File issues in `issues/` as they arise — do not wait until the end
5. If the test user is completely stuck and cannot proceed: ask them to clearly document what they tried and what happened, then file an issue — this distinguishes a hard fail from the test user voluntarily stopping
6. `make test-teardown` — stops the container and removes it

---

## Run Folder Layout

Each test run lives at `test-manual/tmp/YYYY-MM-DD-<repo-slug>/`:

| File / Dir | Owner | Purpose |
|------------|-------|---------|
| `TASK.md` | Guide fills in; test user receives | The task the test user follows |
| `LOG.md` | Test user writes; guide consults | Append-only running narrative of the session |
| `TEST-RUN.md` | Guide | Structured pass/fail grading for each protocol step |
| `issues/` | Guide | One `ISS-NNN.md` file per issue found |

---

## Keeping the Log

`LOG.md` is written by the test user as they work — it is their running narrative of what they did, tried, and observed. The test user receives it alongside `TASK.md` at the start of the session.

As a guide, consult it to:
- Cross-reference with your `TEST-RUN.md` grading
- Identify issues the test user noted but did not flag explicitly
- Understand the sequence of events when a step failed or stalled

`LOG.md` is append-only — the test user should never edit or delete prior entries. If they need to correct something, they add a new entry noting the correction.

---

## Documenting Issues

Issue files are named `ISS-001.md`, `ISS-002.md`, etc. — sequential, zero-padded to three digits — and live in `tmp/<run>/issues/`.

File issues as they arise, not at the end of the session.

When you create one:
- Add a reference in the `LOG.md` entry that prompted it (e.g., `→ ISS-001`)
- Make the issue file self-contained: a developer reading it should be able to understand, reproduce, and assess the issue without reading the session log
