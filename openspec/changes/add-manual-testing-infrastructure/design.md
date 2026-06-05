## Context

Skillet's existing test suite exercises the codebase in isolation: unit tests mock the filesystem, integration tests use sandbox helpers, and the e2e wizard test explicitly documents that full automation of `@inquirer/prompts` is infeasible. There is no process for validating end-to-end correctness against real-world skill repos at different complexity levels. This change introduces the infrastructure needed for a human or coding agent to perform that validation repeatably.

## Goals / Non-Goals

**Goals:**

- Provide a documented, repeatable process for running manual end-to-end tests against real GitHub skill repos
- Support both human testers and coding agents (including tmux-driven agent sessions)
- Isolate every test run inside a clean Docker container (no host environment pollution)
- Produce structured artifacts during testing: a running log per session and one file per issue found
- Maintain a growing catalog of candidate repos and a running record of completed test runs
- Require no custom Dockerfile — use a stock `ubuntu:24.04` image so testers must install Node from scratch (this IS the test)

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

### 3. Stock ubuntu:24.04 — no custom Dockerfile

`ubuntu:24.04` starts bare: no curl, no git, no Node. The tester installs everything from scratch following only the npm README for `create-skillet`. This is not a limitation — it IS the test. If `curl` or `git` must be installed first and that's not mentioned in the npm README, that is a soft fail to record.

**Alternative considered**: A minimal Dockerfile with curl and git pre-installed to reduce setup noise. Rejected: this hides the exact bootstrap experience a real user would encounter.

### 4. wait-for-text.sh adapted from mitsuhiko/agent-stuff

`@inquirer/prompts` renders prompts asynchronously. An agent driving the wizard via `tmux send-keys` must wait for each prompt to appear before sending the next keystroke or the input races ahead of the prompt. `wait-for-text.sh` polls `tmux capture-pane` for a pattern with a configurable timeout and exit-code, allowing the agent to synchronize.

The script is adapted (not forked) from `mitsuhiko/agent-stuff` with socket-awareness added via a `-S` flag.

### 5. Per-repo test plan template, not a single monolithic test plan

Each test run uses a fresh copy of `TEST-RUN.md.template` filled in for the specific repo, tier, and environment. A high-level `TEST-MATRIX.md` catalogs candidate repos and accumulates a one-row-per-run log. This separates the "what we plan to test" concern from the "what we observed" concern, and keeps run artifacts small and focused.

### 6. Tier identification as step 1 of the protocol

The test protocol starts with the tester cloning the repo and identifying its complexity tier (1–5) before running anything. Tier is a property of the repo structure, determined by the number and nesting of SKILL.md files and supporting resources. Recording it in the log allows future analysis across tiers.

**Tier definitions:**
- T1: Single `SKILL.md`, no resources
- T2: Single skill + flat supporting files
- T3: Single skill + nested resources/scripts
- T4: Multiple `SKILL.md` files in subdirectories (multi-skill)
- T5: Multi-skill with scripts, templates, or deep nesting

### 7. Agent environment is selected at test time, not pre-assigned

The target agent environment (Claude Code, GitHub Copilot CLI, a custom agent, etc.) is chosen by the tester at the start of each run and recorded in the `env:` field of `TEST-RUN.md`. The infrastructure does not mandate which environment to use for which tier. Testers should exercise variety across runs to build coverage over time — this is a matter of discipline, not enforcement. The README gives light guidance on what environment means in this context; the TEST-MATRIX run log accumulates the record.

## Risks / Trade-offs

- **Docker + tmux required** → No mitigation; document clearly in README as prerequisites. These are standard developer tools.
- **Manual testing is slow** → Intended. The goal is observational quality testing, not throughput. One tier per session is fine.
- **Candidate repos may move or be deleted** → The TEST-MATRIX.md notes repo state at time of testing. Re-verification is the tester's responsibility at the start of each run.
- **wait-for-text.sh polling has a timeout** → If a prompt takes longer than the timeout (default 15s), the script exits 1 and the agent should investigate rather than blindly proceeding.
- **ubuntu:24.04 apt mirrors can be slow** → Not mitigated; this is part of the real-user experience.
