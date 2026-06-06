## ADDED Requirements

### Requirement: Test harness lives at repo root as test-manual/
The project SHALL contain a `test-manual/` directory at the repository root with all manual testing infrastructure. The directory SHALL NOT be a pnpm workspace package and SHALL contain no `package.json`.

#### Scenario: Directory exists and is not a workspace package
- **WHEN** a developer opens the repository
- **THEN** `test-manual/` exists at the root and is absent from `pnpm-workspace.yaml`

---

### Requirement: Harness defines two distinct roles — Guide and Test user
The harness SHALL be designed around two distinct roles with separate documents and responsibilities.

**Guide** — the person or agent orchestrating the session. Responsible for: choosing the repo and environment, customizing and handing off `TASK.md` and `LOG.md` to the test user, observing the session, grading it in `TEST-RUN.md`, consulting `LOG.md`, and filing issues. The guide has access to all harness documentation.

**Test user** — the person or coding agent performing the task. Receives only `TASK.md` (and `AGENT-SUPPLEMENT.md` if they are a coding agent). SHALL NOT have access to `README.md`, `TEST-RUN.md`, the failure taxonomy, or expected install paths.

#### Scenario: Test user receives only their documents
- **WHEN** a guide sets up a test run
- **THEN** the test user receives `TASK.md` and `LOG.md` (and `AGENT-SUPPLEMENT.md` if they are a coding agent), and nothing else from the harness

---

### Requirement: Makefile provides test-start, test-teardown, and init-run targets
`test-manual/Makefile` SHALL provide:

- **`test-start`** — starts a stock `ubuntu:24.04` Docker container in the background under a fixed container name and opens a host-side tmux session (using a private socket) whose shell is connected to the container via `docker exec -it`. Prints a copy-pasteable `tmux attach` command so a human guide can observe the session.
- **`test-teardown`** — kills the tmux session and removes the container.
- **`init-run REPO=<slug>`** — creates `tmp/YYYY-MM-DD-<slug>/issues/` and copies `TASK.md.template`, `TEST-RUN.md.template`, and `LOG.md.template` into the folder as `TASK.md`, `TEST-RUN.md`, and `LOG.md`. Errors with a usage message if `REPO` is not set.

#### Scenario: test-start launches container and tmux session
- **WHEN** a guide runs `make test-start` from `test-manual/`
- **THEN** a Docker container named `skillet-test-container` is running, a tmux session named `skillet-test` exists on the private socket, and the session's active pane is a bash shell inside the container

#### Scenario: test-teardown cleans up
- **WHEN** a guide runs `make test-teardown` from `test-manual/`
- **THEN** the tmux session is killed and the Docker container is stopped and removed

#### Scenario: init-run creates a complete run folder
- **WHEN** a guide runs `make init-run REPO=my-skill-repo`
- **THEN** `tmp/YYYY-MM-DD-my-skill-repo/` exists and contains `TASK.md`, `TEST-RUN.md`, `LOG.md`, and an empty `issues/` subdirectory

#### Scenario: init-run errors without REPO
- **WHEN** a guide runs `make init-run` without a REPO argument
- **THEN** Make exits with an error message explaining the required usage

---

### Requirement: README is guide orientation
`test-manual/README.md` SHALL serve as guide-only orientation. It SHALL document: the two roles (Guide and Test user), prerequisites (Docker, tmux), the tier reference table (T1–T5 plus O), a before-you-start checklist (consult TEST-MATRIX, choose repo and environment, identify tier, run init-run, fill in TASK.md, attach AGENT-SUPPLEMENT.md for coding agents), the session flow, the run-folder layout (including which documents belong to each role), guidance on keeping the log, and guidance on filing issues.

The README SHALL NOT contain: the step-by-step test protocol (that lives in TEST-RUN.md), the failure taxonomy table (that lives in TEST-RUN.md), or tmux operational commands (those live in AGENT-SUPPLEMENT.md).

#### Scenario: README gives guide the full session flow
- **WHEN** a guide reads `test-manual/README.md`
- **THEN** they have sufficient information to set up a run, hand off documents to the test user, grade the session, file issues, and tear down — without referring to any other document

#### Scenario: README does not reveal grading rubric to test user
- **WHEN** a guide reads `test-manual/README.md`
- **THEN** it contains no expected install paths, no failure taxonomy grades, and no step-by-step protocol with expected outcomes

#### Scenario: README includes tier reference with O tier
- **WHEN** a guide consults the Tier Reference section
- **THEN** it lists T1 through T5 plus O (Other — repo does not fit any defined tier)

#### Scenario: README directs guide to consult TEST-MATRIX first
- **WHEN** a guide reads the Before You Start section
- **THEN** step 1 instructs them to consult `TEST-MATRIX.md` to identify coverage gaps before choosing a repo

---

### Requirement: AGENT-SUPPLEMENT.md provides tmux guidance for coding-agent test users
`test-manual/AGENT-SUPPLEMENT.md` SHALL document: the private tmux socket setup, `send-keys -l` (literal mode) for sending wizard input, `capture-pane -p -J -S -200` for reading output (with explanation of `-J` and `-S -200`), `wait-for-text.sh` usage, `@inquirer/prompts` key sequences (navigate list, select checkbox, confirm, clear field, cancel), and cleanup commands. The guide attaches this alongside `TASK.md` when the test user is a coding agent.

#### Scenario: Coding-agent test user can drive the wizard from the supplement alone
- **WHEN** a coding agent reads `AGENT-SUPPLEMENT.md`
- **THEN** it has sufficient information to interact with the `create-skillet` wizard via `tmux send-keys` without additional documentation

#### Scenario: Human test users do not receive agent-specific guidance
- **WHEN** a guide sets up a run with a human test user
- **THEN** `AGENT-SUPPLEMENT.md` is not included in the documents handed to the test user

---

### Requirement: TASK.md.template provides a repo-specific task brief
`test-manual/templates/TASK.md.template` SHALL present the test as two user-domain tasks: (1) package the skills from the specified repository, (2) install the packaged skills into the specified agent environment. The template SHALL include placeholder fields for the guide to fill in: repo URL and target environment.

The template SHALL NOT contain: expected install paths, failure taxonomy symbols, specific commands (e.g., `npm pack`), or any information that would reveal the "correct" outcome to the test user.

The template SHALL instruct the test user to write their observations in `LOG.md` as they go, and to document clearly what they tried if completely blocked.

#### Scenario: Task brief presents two tasks in user-domain language
- **WHEN** a test user reads their `TASK.md`
- **THEN** it presents packaging and installation as their goal without naming specific tools or expected file locations

#### Scenario: Task brief contains no leading information
- **WHEN** a test user reads their `TASK.md`
- **THEN** it contains no expected paths, no taxonomy symbols, and no commands such as npm pack or npm install

---

### Requirement: README instructs guide to record target agent environment
`test-manual/README.md` SHALL instruct the guide to decide which agent environment they are testing skill installation into (e.g., Claude Code, GitHub Copilot CLI) before starting a session, and to record it in the `env:` field of their `TEST-RUN.md` and `LOG.md`. The README SHALL clarify that environment choice is left to the guide — the infrastructure does not prescribe which to use.

#### Scenario: Guide records environment before proceeding
- **WHEN** a guide begins a new test run
- **THEN** they fill in the `env:` field in `TEST-RUN.md` and `LOG.md` with the chosen agent environment before the session starts

---

### Requirement: TEST-MATRIX.md maintains a candidate repo catalog and run log
`test-manual/TEST-MATRIX.md` SHALL contain: a consultation note at the top directing guides to check for coverage gaps before choosing a repo, a candidate repo catalog table (columns: Tier, Repo, Complexity notes, Status) seeded with at least five repos spanning tiers T1–T5, and a test run log table (columns: Date, Repo, Tier, Env, Outcome, Run folder).

#### Scenario: Catalog contains entries for all five tiers
- **WHEN** the harness is first added to the repo
- **THEN** TEST-MATRIX.md contains at least one candidate repo for each of tiers T1 through T5

#### Scenario: Guide consults matrix before starting
- **WHEN** a guide reads TEST-MATRIX.md
- **THEN** a note at the top instructs them to prioritize untested tiers and environments before choosing a repo

---

### Requirement: Failure taxonomy defines six result grades
The harness SHALL use a six-grade failure taxonomy as the common language for recording outcomes across all test artifacts (TEST-RUN.md steps, TEST-MATRIX run log Outcome column):

- ✅ **Pass** — Worked correctly using only available documentation; UX was clear and defaults were sensible
- 🟡 **Soft fail — docs gap** — Worked but required consulting the GitHub repository README beyond the npm README at any point
- 🟠 **Soft fail — UX issue** — Worked functionally but UX was confusing, defaults were wrong, preview was inaccurate, or post-install guidance was unclear
- 🔶 **Mid fail — functional issue** — Something was wrong functionally (beyond UX or docs), but a workaround allowed the step to complete
- 🔴 **Hard fail** — Threw an error, produced wrong output, or could not be completed even with workarounds
- 🔵 **N/A** — Test step not applicable to this tier or this repo's structure

#### Scenario: Test step outcomes use taxonomy grades
- **WHEN** a guide records the outcome of a protocol step in TEST-RUN.md
- **THEN** they use one of the six taxonomy grades rather than free-form text

#### Scenario: Mid fail captures functional issues with workarounds
- **WHEN** a test step failed due to a functional bug but the guide completed it with a workaround
- **THEN** the guide records 🔶 Mid fail rather than 🟠 (UX issue) or 🔴 (hard fail)

---

### Requirement: TEST-RUN.md.template is the guide's grading sheet
`test-manual/templates/TEST-RUN.md.template` SHALL include: session metadata block (repo, tier, env, **version**, date, tester), the full six-grade failure taxonomy key, a blockquote note at the top of the protocol directing the guide to file issues continuously rather than at the end, a **six-step happy-path protocol** in guide-observation language (the guide observes and grades what the test user does — not instructions to the test user), a soft-fail log table, an issues-filed list, and a UX quality observations section.

The six steps SHALL be:
1. Identify the tier (record result; tier definitions in README)
2. Bootstrap (grade whether test user set up using only the npm README; include npm README link)
3. Run create-skillet (grade wizard navigation and defaults)
4. Verify output (observe what test user does; note whether tool output gave sufficient guidance)
5. Install skill (grade whether test user found install path from available docs)
6. Verify skill placement (confirm files landed correctly; include expected-paths table by environment)

The template SHALL NOT contain: the tier definition table (now in README), an edge cases / unhappy paths section, a Step 7 document issues step.

#### Scenario: Template metadata includes version field
- **WHEN** a guide fills in TEST-RUN.md
- **THEN** they record the version of `create-skillet` used during the session

#### Scenario: Guide's grading language does not instruct the test user
- **WHEN** a guide reads the happy-path protocol
- **THEN** each step is framed as an observation or grading activity (e.g., "Observe what the test user does…", "Grade whether…"), not as instructions to the test user

#### Scenario: Issue filing is noted as continuous
- **WHEN** a guide opens TEST-RUN.md
- **THEN** a note at the top of the protocol directs them to file issues as they arise, not at the end of the session

#### Scenario: Expected-paths table is in Step 6
- **WHEN** a guide grades Step 6
- **THEN** the template shows expected skill install paths per environment (Claude Code, GitHub Copilot CLI, Custom agent) for reference

---

### Requirement: LOG.md.template is the test user's session narrative
`test-manual/templates/LOG.md.template` SHALL be the test user's running narrative of what they did, tried, and observed. It SHALL be append-only. The header SHALL include: repo, tier, env, **version**, date, tester, and Docker base image. Format examples in the template SHALL be in first-person from the test user's perspective.

The guide SHALL consult `LOG.md` to cross-reference with `TEST-RUN.md` grading, identify issues the test user noted but did not flag explicitly, and understand the sequence of events when a step failed.

#### Scenario: LOG.md entries are timestamped and append-only
- **WHEN** a test user records an observation during a session
- **THEN** a new HH:MM-prefixed entry is appended without modifying any prior entry

#### Scenario: LOG.md format examples are in first-person
- **WHEN** a test user opens a new LOG.md from the template
- **THEN** the example entries are written from the test user's point of view (e.g., "Ran `npx create-skillet`…" not "Test user ran…")

#### Scenario: LOG.md references issue files as they are created
- **WHEN** a test user creates an issue file during a session
- **THEN** the LOG.md entry that prompted the issue references the issue identifier (ISS-NNN)

---

### Requirement: ISSUE.md template captures structured issue detail with sequential identifiers
Issue files SHALL be named `ISS-001.md`, `ISS-002.md`, etc. — sequentially numbered within a run, zero-padded to three digits — and placed in `tmp/<run>/issues/`. `test-manual/templates/ISSUE.md.template` SHALL include fields for: issue title, Description (symptom), Steps to reproduce (numbered list), Expected result, Actual result, How encountered, Why it is bad (user impact), Severity (critical/high/medium/low), and Workaround.

#### Scenario: Filled issue file is self-contained
- **WHEN** a developer reads a completed issue file from `tmp/<run>/issues/`
- **THEN** they can understand the issue, reproduce it, and assess its severity without referring to the session log

#### Scenario: Issue template separates expected from actual outcome
- **WHEN** a guide fills in an issue file
- **THEN** there are distinct fields for what should have happened (Expected result) and what actually happened (Actual result)

---

### Requirement: wait-for-text.sh synchronizes tmux pane polling
`test-manual/scripts/wait-for-text.sh` SHALL accept `-S` (socket), `-t` (pane target), `-p` (pattern), `-T` (timeout seconds), `-i` (poll interval), and `-F` (fixed string) flags, poll `tmux capture-pane` until the pattern matches or the timeout elapses, exit 0 on match and 1 on timeout, and print the last captured text to stderr on timeout.

#### Scenario: Script exits 0 when pattern appears
- **WHEN** `wait-for-text.sh` is called and the target pane output contains the pattern within the timeout
- **THEN** the script exits 0

#### Scenario: Script exits 1 and prints captured text on timeout
- **WHEN** `wait-for-text.sh` is called and the pattern does not appear within the timeout
- **THEN** the script exits 1 and the last captured pane content is printed to stderr

---

### Requirement: Run folders are named by date and repo slug
Test run folders under `test-manual/tmp/` SHALL be named `YYYY-MM-DD-<repo-slug>/` where `<repo-slug>` is a kebab-case identifier for the repo. Each run folder SHALL contain at minimum a `TASK.md`, a `LOG.md`, a `TEST-RUN.md`, and an `issues/` subdirectory. Run folders are created via `make init-run REPO=<slug>`.

#### Scenario: Run folder is identifiable by date and repo
- **WHEN** a guide lists `test-manual/tmp/`
- **THEN** each folder name indicates when the run occurred and which repo was tested, without opening any file

---

### Requirement: tmp/ is gitignored and never committed
The root `.gitignore` SHALL contain `test-manual/tmp/*` (contents pattern, not directory pattern) so that `tmp/.gitkeep` can be committed while all ephemeral test content is excluded. All cloned repos, run folders, logs, and issue files SHALL live under `tmp/` and SHALL never be committed.

#### Scenario: test-manual/tmp/ contents are not tracked by git
- **WHEN** a tester clones a repo into `test-manual/tmp/` and runs `git status`
- **THEN** the cloned content does not appear as untracked files

#### Scenario: tmp/.gitkeep is committed
- **WHEN** the harness is first added to the repo
- **THEN** `test-manual/tmp/.gitkeep` exists in the repository and `git ls-files test-manual/tmp/` lists it
