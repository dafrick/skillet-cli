## ADDED Requirements

### Requirement: Test harness lives at repo root as test-manual/
The project SHALL contain a `test-manual/` directory at the repository root with all manual testing infrastructure. The directory SHALL NOT be a pnpm workspace package and SHALL contain no `package.json`.

#### Scenario: Directory exists and is not a workspace package
- **WHEN** a developer opens the repository
- **THEN** `test-manual/` exists at the root and is absent from `pnpm-workspace.yaml`

---

### Requirement: Makefile provides test-start and test-teardown targets
`test-manual/Makefile` SHALL provide a `test-start` target that starts a stock `ubuntu:24.04` Docker container in the background under a fixed container name and opens a host-side tmux session (using a private socket) whose shell is connected to the container via `docker exec -it`. It SHALL provide a `test-teardown` target that kills the tmux session and removes the container.

#### Scenario: test-start launches container and tmux session
- **WHEN** a tester runs `make test-start` from `test-manual/`
- **THEN** a Docker container named `skillet-test-container` is running, a tmux session named `skillet-test` exists on the private socket, and the session's active pane is a bash shell inside the container

#### Scenario: test-teardown cleans up
- **WHEN** a tester runs `make test-teardown` from `test-manual/`
- **THEN** the tmux session is killed and the Docker container is stopped and removed

#### Scenario: Makefile prints the monitor command after test-start
- **WHEN** `make test-start` completes
- **THEN** the Makefile prints a copy-pasteable `tmux attach` command so a human can observe the session

---

### Requirement: README documents the full test protocol
`test-manual/README.md` SHALL document: prerequisites (Docker, tmux), how to run `make test-start` and `make test-teardown`, the seven-step test protocol (identify tier → bootstrap Node → run create-skillet → verify output → install skill → verify skill placement → document issues), and a Tmux reference section for coding agents.

#### Scenario: Agent can drive create-skillet wizard using only the README
- **WHEN** a coding agent reads `test-manual/README.md`
- **THEN** it has sufficient information to start a container, navigate the `create-skillet` wizard via `tmux send-keys`, and document findings without additional documentation

#### Scenario: README documents @inquirer/prompts key sequences
- **WHEN** a tester consults the Tmux reference section
- **THEN** it lists key sequences for: navigate list (arrow keys), select checkbox (space), confirm (Enter), accept default (Enter), clear field (Ctrl+U), cancel (Ctrl+C)

---

### Requirement: README documents the private socket convention
`test-manual/README.md` SHALL specify the tmux private socket path (`${TMPDIR:-/tmp}/claude-tmux-sockets/skillet.sock`) and require all agent tmux commands to use `-S "$SOCKET"` so agent sessions do not pollute the developer's personal tmux server.

#### Scenario: Agent uses private socket for all tmux commands
- **WHEN** an agent follows the README Tmux reference
- **THEN** every `tmux` command includes `-S "$SOCKET"` where `$SOCKET` points to the private socket path

---

### Requirement: README instructs tester to record their target agent environment
`test-manual/README.md` SHALL instruct the tester to decide which agent environment they are testing skill installation into (e.g., Claude Code, GitHub Copilot CLI) before starting a session, and to record it in the `env:` field of their `TEST-RUN.md` metadata block. The README SHALL clarify that environment choice is left to the tester — the infrastructure does not prescribe which to use.

#### Scenario: Tester records environment before proceeding
- **WHEN** a tester begins a new test run
- **THEN** they fill in the `env:` field of their `TEST-RUN.md` with the chosen agent environment before running the first test step

---

### Requirement: TEST-MATRIX.md maintains a candidate repo catalog and run log
`test-manual/TEST-MATRIX.md` SHALL contain two sections: a candidate repo catalog table (columns: Tier, Repo, Complexity notes, Status) and a test run log table (columns: Date, Repo, Tier, Env, Outcome, Run folder). The catalog SHALL be seeded with at least five repos spanning all five tiers.

#### Scenario: Catalog contains entries for all five tiers
- **WHEN** the harness is first added to the repo
- **THEN** TEST-MATRIX.md contains at least one candidate repo for each of tiers 1 through 5

#### Scenario: Run log row is added after completing a test session
- **WHEN** a tester finishes a test session
- **THEN** a new row is appended to the run log with date, repo URL, tier, environment, one-word outcome, and path to the run folder under tmp/

---

### Requirement: Per-run template covers tier identification, happy path, edge cases, and UX quality
`test-manual/templates/TEST-RUN.md.template` SHALL include sections for: session metadata (repo, tier, env, date, tester), step-by-step protocol with checkboxes, a soft-fail log (steps that required the GitHub README beyond the npm README), an issues list (linked to files in `issues/`), and a UX quality observations section.

#### Scenario: First step of template is tier identification
- **WHEN** a tester opens the TEST-RUN template
- **THEN** the first substantive step is "Identify the tier" with guidance on the five tier definitions

---

### Requirement: Session LOG.md captures a running narrative of test activity
Each test run SHALL produce a `tmp/<run>/LOG.md` file that accumulates timestamped free-form entries as the session progresses. `test-manual/templates/LOG.md.template` SHALL provide the starting structure. The LOG.md is the primary artifact for reconstructing how an issue was encountered — it documents what the tester was doing, in what order, and what workarounds were tried. It is distinct from `TEST-RUN.md`: the test run template records pass/fail status against structured steps; the log captures the unstructured narrative of how the tester arrived at each state.

The file SHALL be strictly append-only: entries are never edited or deleted once written. Each entry SHALL be prefixed with the current time (HH:MM format). When an issue file is created, the log entry that prompted it SHALL reference the issue identifier (e.g., `→ ISS-001`).

#### Scenario: LOG.md entries are timestamped and append-only
- **WHEN** a tester records an observation during a session
- **THEN** a new HH:MM-prefixed entry is added at the bottom of LOG.md without modifying any prior entry

#### Scenario: LOG.md references issue files as they are created
- **WHEN** a tester creates an issue file during a session
- **THEN** the LOG.md entry that prompted the issue references the issue identifier (ISS-NNN)

#### Scenario: LOG.md is distinct from TEST-RUN.md
- **WHEN** a reviewer reads both files from the same run folder
- **THEN** TEST-RUN.md shows which protocol steps passed or failed, while LOG.md shows the narrative of what happened and how

---

### Requirement: ISSUE.md template captures structured issue detail
`test-manual/templates/ISSUE.md.template` SHALL include fields for: issue title, description (what happened), reproduction steps, how encountered, why it is bad (user impact), severity (critical/high/medium/low), and workaround (if any).

#### Scenario: Filled issue file is self-contained
- **WHEN** a developer reads a completed issue file from `tmp/<run>/issues/`
- **THEN** they can understand the issue, reproduce it, and assess its severity without referring to the session log

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
Test run folders under `test-manual/tmp/` SHALL be named `YYYY-MM-DD-<repo-slug>/` where `<repo-slug>` is the kebab-cased last path segment of the repo URL (e.g., `2026-06-05-agent-rules-skill/`). Each run folder SHALL contain at minimum a `LOG.md`, a filled `TEST-RUN.md`, and an `issues/` subdirectory.

#### Scenario: Run folder is identifiable by date and repo
- **WHEN** a tester lists `test-manual/tmp/`
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
