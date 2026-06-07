## MODIFIED Requirements

### Requirement: Makefile provides test-start, test-teardown, and init-run targets
`test-manual/Makefile` SHALL provide:

- **`test-start`** — starts a stock `ubuntu:24.04` Docker container in the background under a fixed container name, installs Node 24 inside the container (via NodeSource `setup_24.x`) **and Git**, and opens a host-side tmux session (using a private socket) whose shell is connected to the container via `docker exec -it`. Prints a copy-pasteable `tmux attach` command so a human guide can observe the session.
- **`test-teardown`** — kills the tmux session and removes the container.
- **`init-run REPO=<slug>`** — creates `runs/YYYY-MM-DD-<slug>/issues/` and copies `TASK.md.template`, `TEST-RUN.md.template`, `LOG.md.template`, and `AGENT-SUPPLEMENT.md` into the folder as `TASK.md`, `TEST-RUN.md`, `LOG.md`, and `AGENT-SUPPLEMENT.md`. Errors with a usage message if `REPO` is not set. The `<slug>` should use `org-repo` format (replace `/` with `-`).

#### Scenario: test-start launches container and tmux session
- **WHEN** a guide runs `make test-start` from `test-manual/`
- **THEN** a Docker container named `skillet-test-container` is running, Node 24 **and Git** are installed inside the container, a tmux session named `skillet-test` exists on the private socket, and the session's active pane is a bash shell inside the container

#### Scenario: test-teardown cleans up
- **WHEN** a guide runs `make test-teardown` from `test-manual/`
- **THEN** the tmux session is killed and the Docker container is stopped and removed

#### Scenario: init-run creates a complete run folder
- **WHEN** a guide runs `make init-run REPO=my-skill-repo`
- **THEN** `runs/YYYY-MM-DD-my-skill-repo/` exists and contains `TASK.md`, `TEST-RUN.md`, `LOG.md`, `AGENT-SUPPLEMENT.md`, and an empty `issues/` subdirectory

#### Scenario: init-run errors without REPO
- **WHEN** a guide runs `make init-run` without a REPO argument
- **THEN** Make exits with an error message explaining the required usage

---

### Requirement: Harness defines two distinct roles — Guide and Test user
The harness SHALL be designed around two distinct roles with separate documents and responsibilities.

**Guide** — the person or agent orchestrating the session. Responsible for: choosing the repo and environment, customizing and handing off `TASK.md` and `LOG.md` to the test user, observing the session, grading it in `TEST-RUN.md`, consulting `LOG.md`, and filing issues. The guide has access to all harness documentation.

**Test user** — the person or coding agent performing the task. Receives only `TASK.md` (and `AGENT-SUPPLEMENT.md` if they are a coding agent). SHALL NOT have access to `README.md`, `TEST-RUN.md`, the failure taxonomy, or expected install paths.

**When the test user is a coding agent**, the guide SHALL dispatch them as an isolated sub-agent — a fresh agent invocation with only `TASK.md`, `LOG.md`, and `AGENT-SUPPLEMENT.md` in its initial context, and no prior conversation history from the guide's session. The guide observes the sub-agent's tmux output and LOG, then grades independently in `TEST-RUN.md`. The guide SHALL NOT use the same agent session for both roles, as prior-run knowledge in the guide agent's context will leak into the test user's behavior and soften failure grades.

#### Scenario: Test user receives only their documents
- **WHEN** a guide sets up a test run
- **THEN** the test user receives `TASK.md` and `LOG.md` (and `AGENT-SUPPLEMENT.md` if they are a coding agent), and nothing else from the harness

#### Scenario: Coding-agent test user is dispatched with isolated context
- **WHEN** a guide uses a coding agent as the test user
- **THEN** the agent is invoked as a sub-agent (or equivalent fresh session) with only the test user's three documents in its initial context — no harness README, no prior session history, no knowledge of expected outcomes

#### Scenario: Guide does not play both roles in the same session
- **WHEN** a guide is also a coding agent running the session
- **THEN** the guide dispatches a separate sub-agent for the test user role rather than performing the task themselves within the same context

---

### Requirement: README is guide orientation
`test-manual/README.md` SHALL serve as guide-only orientation. It SHALL document: the two roles (Guide and Test user), prerequisites (Docker, tmux), the tier reference table (T1–T5 plus O), a before-you-start checklist (consult TEST-MATRIX, choose repo and environment, **re-inspect the repo to confirm the tier against the matrix entry and correct it if wrong**, run init-run using `org-repo` slug format, **run prep-run to clone the repo into the container**, fill in TASK.md, pre-fill LOG.md frontmatter leaving `tester:` for the test user, **for coding-agent test users: dispatch as isolated sub-agent with only TASK.md, LOG.md, and AGENT-SUPPLEMENT.md in context**), the session flow (including how to hand files to human vs coding-agent test users, and how to observe each), the run-folder layout (including which documents belong to each role), guidance on keeping the log, and guidance on filing issues.

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

#### Scenario: README requires tier re-inspection before every run
- **WHEN** a guide reads the Before You Start checklist
- **THEN** a step explicitly instructs them to re-inspect the repo and confirm or correct the tier in the matrix entry before proceeding — framed as a required action, not a suggestion

#### Scenario: README instructs guide to run prep-run before handing off
- **WHEN** a guide reads the Before You Start checklist
- **THEN** a step instructs them to run `make prep-run REPO_URL=<url>` after `make test-start` to clone the repo into the container before the test user begins

#### Scenario: README explains sub-agent dispatch for coding-agent test users
- **WHEN** a guide reads the session flow section
- **THEN** it explains that coding-agent test users must be dispatched as isolated sub-agents with no prior session context, and explains why (context leakage softens failure grades)

---

### Requirement: AGENT-SUPPLEMENT.md provides tmux guidance for coding-agent test users
`test-manual/AGENT-SUPPLEMENT.md` SHALL document: the private tmux socket setup, `send-keys -l` (literal mode) for sending wizard input, `capture-pane -p -J -S -200` for reading output (with explanation of `-J` and `-S -200`), `wait-for-text.sh` usage **with a note that the script path must be resolved relative to the `test-manual/` directory (e.g., using `$(git rev-parse --show-toplevel)/test-manual/scripts/wait-for-text.sh`) since the agent's working directory may differ**, `@inquirer/prompts` key sequences (navigate list, select checkbox, confirm, clear field, cancel), cleanup commands, **and a note that log entries written to `LOG.md` are plain-text lines (`HH:MM ...` format) and must not be wrapped in HTML comment syntax (`<!-- ... -->`)**. The guide attaches this alongside `TASK.md` when the test user is a coding agent.

#### Scenario: Coding-agent test user can drive the wizard from the supplement alone
- **WHEN** a coding agent reads `AGENT-SUPPLEMENT.md`
- **THEN** it has sufficient information to interact with the `create-skillet` wizard via `tmux send-keys` without additional documentation

#### Scenario: Human test users do not receive agent-specific guidance
- **WHEN** a guide sets up a run with a human test user
- **THEN** `AGENT-SUPPLEMENT.md` is not included in the documents handed to the test user

#### Scenario: Agent resolves wait-for-text.sh path correctly regardless of working directory
- **WHEN** a coding-agent test user calls `wait-for-text.sh` from any working directory
- **THEN** the script path resolves correctly using the pattern documented in AGENT-SUPPLEMENT.md

#### Scenario: Agent does not wrap log entries in comment syntax
- **WHEN** a coding-agent test user reads AGENT-SUPPLEMENT.md before writing to LOG.md
- **THEN** the supplement makes clear that entries are plain-text lines, not HTML comment blocks, preventing the agent from mirroring the comment syntax of the format-examples block

---

### Requirement: LOG.md.template is the test user's session narrative
`test-manual/templates/LOG.md.template` SHALL be the test user's running narrative of what they did, tried, and observed. It SHALL be append-only. The header fields (repo, tier, env, create-skillet-version, date, tester, docker-image) and the guide pre-fill annotation are unchanged from the current template. The new requirement for this change is: format examples in the template SHALL appear in a fully self-contained HTML comment block that is explicitly closed before the append region begins, **with no blank line between the closing `-->` of the examples block and the `<!-- Append entries below. -->` marker**, so there is no ambiguous insertion zone between the two comment blocks and test user entries are never inadvertently placed inside a comment.

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

#### Scenario: Format examples do not swallow log entries
- **WHEN** a test user appends their first log entry to a fresh LOG.md
- **THEN** the entry appears as visible Markdown content, not inside an HTML comment block

#### Scenario: Log entries are plain text, not comment-wrapped
- **WHEN** a coding-agent test user appends a log entry
- **THEN** the entry is a plain-text `HH:MM ...` line, not wrapped in `<!-- -->` comment syntax
