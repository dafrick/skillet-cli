## Context

Skillet's existing test suite exercises the codebase in isolation: unit tests mock the filesystem, integration tests use sandbox helpers, and the e2e wizard test explicitly documents that full automation of `@inquirer/prompts` is infeasible. There is no process for validating end-to-end correctness against real-world skill repos at different complexity levels. This change introduces the infrastructure needed for a human or coding agent to perform that validation repeatably.

## Goals / Non-Goals

**Goals:**

- Provide a documented, repeatable process for running manual end-to-end tests against real GitHub skill repos
- Support both human testers and coding agents (including tmux-driven agent sessions)
- Isolate every test run inside a clean Docker container (no host environment pollution)
- Produce structured artifacts during testing: a task brief for the test user, a running log of their session, a graded protocol sheet for the guide, and one file per issue found
- Maintain a growing catalog of candidate repos and a running record of completed test runs
- Require no custom Dockerfile — use a stock `ubuntu:24.04` image; `test-start` pre-installs Node 24 so test sessions begin with a working Node environment

**Non-Goals:**

- Automated test execution or CI integration — this is an exploratory manual testing tool
- Regression suite or test fixtures committed to the repo
- Testing in non-Docker environments
- Publishing or committing test artifacts (tmp/ is always ephemeral and gitignored)

## Decisions

### 1. Tmux on host, shell inside container — not Tmux inside container

The container runs in the background (`docker run -d`). A tmux session lives on the **host** with its shell connected to the container via a single `docker exec -it <container> bash`. This means the agent or human sends all subsequent commands through `tmux send-keys` — no `docker exec` per command.

**Alternative considered**: Starting tmux inside the container and running `docker exec` for each `send-keys` call. Rejected: more verbose for the agent, requires knowing the container exec path on every command.

**Architecture:**
```
Host
└── tmux session (private socket)
     └── Window 0: "docker exec -it skillet-test bash"
                    ↑ persistent shell inside ubuntu:24.04
Agent: tmux -S "$SOCKET" send-keys -t skillet-test "npx create-skillet" Enter
```

### 2. Private tmux socket convention (from mitsuhiko/agent-stuff)

Agent tmux sessions MUST use a private socket under `${TMPDIR:-/tmp}/claude-tmux-sockets/` rather than the default tmux socket. This prevents agent sessions from appearing in and polluting the developer's personal tmux server.

Socket path: `${TMPDIR:-/tmp}/claude-tmux-sockets/skillet.sock`

### 3. Stock ubuntu:24.04 — no custom Dockerfile; Node pre-installed by test-start

`ubuntu:24.04` starts bare: no curl, no git, no Node. `make test-start` installs Node 24 (via the NodeSource `setup_24.x` script) inside the container before opening the tmux session, so test users begin with a working Node environment.

Node installation is not the test — discovering and using `create-skillet` is. Pre-installing Node removes an environmental obstacle that would generate noise (false soft-fails on Node setup) rather than signal about the skillet UX. `curl` and `git` are still not pre-installed; if either is needed and not mentioned in the npm README for `create-skillet`, that remains a valid soft fail to record.

**Alternative considered**: Requiring test users to install Node from scratch as part of the session. Rejected: adds a setup burden that is orthogonal to what we are measuring, and causes `TASK.md`'s "Node and npm are available" contract to be false until the test user resolves it themselves.

### 4. wait-for-text.sh adapted from mitsuhiko/agent-stuff

`@inquirer/prompts` renders prompts asynchronously. An agent driving the wizard via `tmux send-keys` must wait for each prompt to appear before sending the next keystroke or the input races ahead of the prompt. `wait-for-text.sh` polls `tmux capture-pane` for a pattern with a configurable timeout and exit-code, allowing the agent to synchronize.

The script is adapted (not forked) from `mitsuhiko/agent-stuff` with socket-awareness added via a `-S` flag.

### 5. Per-repo test plan template, not a single monolithic test plan

Each test run uses a fresh copy of `TEST-RUN.md.template` filled in for the specific repo, tier, and environment. A high-level `TEST-MATRIX.md` catalogs candidate repos and accumulates a one-row-per-run log. This separates the "what we plan to test" concern from the "what we observed" concern, and keeps run artifacts small and focused.

### 6. Tier identification is a guide pre-session activity, not a test protocol step

The guide classifies the repo's complexity tier (T1–T5, O) before the test session begins and records it in `TEST-RUN.md`. Tier is a property of the repo structure, not something the test user assesses. Tier definitions live in the README as a reference table the guide consults — they are not embedded in the TEST-RUN template.

**Tier definitions:**
- T1: Single `SKILL.md`, no resources
- T2: Single skill + flat supporting files
- T3: Single skill + nested resources/scripts
- T4: Multiple `SKILL.md` files in subdirectories (multi-skill)
- T5: Multi-skill with scripts, templates, or deep nesting
- O: Other — repo does not fit any tier above

### 7. Agent environment is selected at test time, not pre-assigned

The target agent environment (Claude Code, GitHub Copilot CLI, a custom agent, etc.) is chosen by the guide at the start of each run and recorded in the `env:` field of `TEST-RUN.md`. The infrastructure does not mandate which environment to use for which tier. Guides should exercise variety across runs to build coverage over time — this is a matter of discipline, not enforcement.

### 8. Two distinct roles: Guide and Test user

The harness introduces an explicit separation between two roles with different documents and responsibilities:

**Guide** — the person or agent orchestrating the session. Sets up the container, chooses the repo and environment, customizes TASK.md, hands off documents to the test user, observes the session, grades it in TEST-RUN.md, consults LOG.md, and files issues. The guide has access to all harness documentation.

**Test user** — the person or coding agent performing the task. Receives only `TASK.md` (and `AGENT-SUPPLEMENT.md` if they are a coding agent). Has no access to README, TEST-RUN.md, the failure taxonomy, or expected install paths.

This separation ensures the test user's experience is not contaminated by insider knowledge. The guide is responsible for grading based on observation, not by instructing the test user on what to find.

### 9. TASK.md as the test user's task brief

Each run produces a `TASK.md` (from `TASK.md.template`) that the guide customizes with the repo URL, target environment, and any run-specific context. The brief presents the task in user-domain terms — "package the skills" and "install them" — without naming specific tools or expected outcomes. The test user must discover the tooling from publicly available documentation.

This is the primary instrument of the user study: what the test user does with only the brief and the public docs is what we observe.

### 10. LOG.md is the test user's artifact, consulted by the guide

The test user writes `LOG.md` as a running first-person narrative of their session. It captures what they did, tried, and observed — in the order it happened. The guide consults it to cross-reference with TEST-RUN.md grading and surface issues the test user noted but did not flag explicitly.

**Alternative considered**: Guide writes the log as a third-person observation record. Rejected: the test user's own language reveals confusion and surprise that a third-person observation would flatten. Having the test user write it also reduces the guide's cognitive load during the session.

### 11. AGENT-SUPPLEMENT.md separates coding-agent guidance from guide orientation

Tmux operational guidance (send-keys, capture-pane, wait-for-text.sh, key sequences) is extracted from README into a standalone `AGENT-SUPPLEMENT.md`. The guide attaches it alongside `TASK.md` when the test user is a coding agent.

This keeps README focused on guide orientation and prevents human test users from being confronted with irrelevant technical detail.

### 12. make init-run scaffolds run folders from templates

`make init-run REPO=<slug>` creates the run folder (`tmp/YYYY-MM-DD-<slug>/`), copies TASK.md, TEST-RUN.md, LOG.md, and AGENT-SUPPLEMENT.md from their source locations, and creates `issues/`. The guide then fills in TASK.md, pre-fills LOG.md's frontmatter (repo, tier, env, create-skillet-version, date, docker-image — leaving `tester:` for the test user), and hands both to the test user. AGENT-SUPPLEMENT.md is provided to coding-agent test users alongside TASK.md and LOG.md.

The `<slug>` uses `org-repo` format (replace `/` with `-`), e.g. `netresearch/agent-rules-skill` → `netresearch-agent-rules-skill`. This ensures run folder names are unambiguous when multiple orgs host repos with the same name.

**Alternative considered**: Manual folder creation and template copying. Rejected: error-prone and inconsistent; init-run ensures the folder is complete and correctly named on the first attempt.

## Risks / Trade-offs

- **Docker + tmux required** → No mitigation; document clearly in README as prerequisites. These are standard developer tools.
- **Manual testing is slow** → Intended. The goal is observational quality testing, not throughput. One tier per session is fine.
- **Candidate repos may move or be deleted** → The TEST-MATRIX.md notes repo state at time of testing. Re-verification is the tester's responsibility at the start of each run.
- **wait-for-text.sh polling has a timeout** → If a prompt takes longer than the timeout (default 15s), the script exits 1 and the agent should investigate rather than blindly proceeding.
- **ubuntu:24.04 apt mirrors can be slow** → Not mitigated; this is part of the real-user experience.
- **Test user may not complete all steps** → The guide distinguishes a hard fail (test user blocked and documented it) from voluntary stopping (test user gave up without documenting); the harness provides guidance for both.
