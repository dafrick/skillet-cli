## ADDED Requirements

### Requirement: Prompt file exists at prompts/auto-issue.md
The repository SHALL contain a `prompts/auto-issue.md` file suitable for use as a Claude Code `/loop` or `/schedule` prompt. The file SHALL be self-contained — no external state files — and SHALL document its prerequisites at the top.

#### Scenario: File is present and invocable
- **WHEN** a user runs `/loop prompts/auto-issue.md` in Claude Code
- **THEN** the agent begins Phase 0 state assessment without requiring further user input

### Requirement: Prerequisites declared
The prompt SHALL declare at its top that OpenSpec skills (`/opsx:*`) and Superpowers skills are required to be installed, and that `gh` CLI must be authenticated with repo write access. The prompt SHALL NOT attempt to install these prerequisites.

#### Scenario: Prerequisites section is present
- **WHEN** a user reads `prompts/auto-issue.md`
- **THEN** the prerequisites section clearly states what must be installed before running

### Requirement: Phase 0 — State assessment
On each run the agent SHALL first check for any open PRs it previously created (identified by the `<!-- agent-state:` HTML comment in the PR description). If an in-progress PR is found and is not in NEEDS-INPUT or BLOCKED state, the agent SHALL resume from the phase recorded in that PR. If the PR is in NEEDS-INPUT or BLOCKED state, the agent SHALL skip it and look for another open PR or proceed to triage a new issue.

#### Scenario: Resume in-progress PR
- **WHEN** an open PR exists with agent-state phase "IMPLEMENT" and blocked: false
- **THEN** the agent resumes from Phase 5 (implement) without re-running earlier phases

#### Scenario: Skip blocked PR
- **WHEN** an open PR exists with agent-state phase "NEEDS-INPUT"
- **THEN** the agent skips that PR and checks for other open agent PRs or picks a new issue

### Requirement: Phase 1 — Issue triage
When no in-progress work is found, the agent SHALL select an open GitHub issue scored against three criteria: (1) the issue body is clear enough to act on with defined expected behavior, (2) no unanswered clarification requests exist in issue comments, (3) the change is minor in scope with no major architecture implications. The agent SHALL verify no existing open PR already references the selected issue before proceeding.

#### Scenario: Skip issue with existing PR
- **WHEN** issue #36 has an existing open PR referencing it
- **THEN** the agent does not pick issue #36 and selects another issue

#### Scenario: Skip issue with open questions
- **WHEN** an issue has unanswered comments requesting clarification from the author
- **THEN** the agent does not select that issue

### Requirement: Phase 2 — Workspace setup
Before any exploration or code changes, the agent SHALL ensure it is on the latest `origin/main` (via `git pull origin main`), create a branch named `fix/N-slug` for bugs or `feat/N-slug` for enhancements (where N is the issue number and slug is a kebab-case summary), create a git worktree for isolated work, push an empty initial commit to establish the branch on origin, and immediately create a draft PR for state tracking.

#### Scenario: Branch created from latest main
- **WHEN** the agent sets up workspace for issue #36
- **THEN** a branch `fix/36-spurious-dep-warning` is created from the latest `origin/main` commit with an empty initial commit, pushed to origin, and a draft PR is opened

### Requirement: Phase 3 — Exploration with question detection
The agent SHALL invoke `/opsx:explore` on the selected issue, reading the issue body and relevant code. If the exploration surfaces critical open questions that block autonomous implementation, the agent SHALL create a PR on the current branch with those questions documented in the PR description and SHALL set the agent-state to NEEDS-INPUT. If no critical questions exist, the agent SHALL proceed to Phase 4.

#### Scenario: Critical questions found
- **WHEN** exploration reveals an ambiguity that requires human decision before implementation
- **THEN** a PR is created, the PR description contains the questions, and agent-state phase is set to NEEDS-INPUT

#### Scenario: No critical questions
- **WHEN** exploration completes with no blocking unknowns
- **THEN** the agent proceeds to Phase 4 without creating a blocking PR

### Requirement: Phase 4 — OpenSpec proposal
The agent SHALL invoke `/opsx:propose` to create a change proposal, then commit and push the OpenSpec artifacts. The agent SHALL then run `/code-review` on the proposal and implement all reasonable in-scope suggestions before committing and pushing again.

#### Scenario: Proposal committed to branch
- **WHEN** Phase 4 completes
- **THEN** `openspec/changes/<name>/proposal.md` (and other artifacts) exist on the branch and are pushed to origin

### Requirement: Phase 5 — Implementation with TDD
The agent SHALL invoke `/opsx:apply` using TDD sub-agents to implement the change. The agent SHALL commit and push frequently (after each logical unit of work) using explicit file staging (not interactive). After each push the agent SHALL monitor CI status. If CI fails, the agent SHALL attempt a fix and push again, up to 3 total fix attempts. If CI still fails after 3 attempts, the agent SHALL post a PR comment explaining what was tried and stop Phase 5. When all tasks are complete and CI passes, the agent SHALL reset `ciFixes` to 0 in the agent-state as part of the transition to Phase 6.

#### Scenario: CI passes within 3 attempts
- **WHEN** CI fails once but a fix is applied and CI passes on the second run
- **THEN** the agent proceeds to Phase 6 with `ciFixes` reset to 0

#### Scenario: CI fails 3 times
- **WHEN** CI fails on all 3 fix attempts in Phase 5
- **THEN** the agent posts a PR comment detailing the failure and the fixes attempted, and stops

### Requirement: Phase 6 — Code review
The agent SHALL invoke the `superpowers:requesting-code-review` skill as an independent sub-agent via the Agent tool, passing only the PR number (so the sub-agent has no prior context). The agent SHALL implement all reasonable in-scope suggestions from the review, commit, and push. The agent SHALL then monitor CI and apply up to 3 fix cycles using the same rules as Phase 5.

#### Scenario: Review sub-agent is independent
- **WHEN** Phase 6 begins
- **THEN** `superpowers:requesting-code-review` is invoked via Agent tool with only the PR number, not the full conversation context

### Requirement: Phase 7 — Wrap-up
After implementation and review pass, the agent SHALL update the PR description to reflect the final state of changes, review all OpenSpec artifacts (proposal, design, tasks) for accuracy and update them if needed, commit and push any artifact updates, invoke `/opsx:archive`, and assign `dafrick` as the PR reviewer.

#### Scenario: PR assigned to reviewer
- **WHEN** Phase 7 completes successfully
- **THEN** GitHub user `dafrick` is assigned as a reviewer on the PR

### Requirement: Phase 8 — Teardown
After every run (success or stop), the agent SHALL exit the worktree, remove it with `git worktree remove` (using `--force` if needed), return to the `main` branch, and run `git pull origin main` to ensure the next iteration starts from the latest state. Worktrees SHALL NOT accumulate across runs.

#### Scenario: Teardown after NEEDS-INPUT stop
- **WHEN** Phase 3 stops due to NEEDS-INPUT
- **THEN** Phase 8 still runs: agent exits worktree, removes it, checks out main, pulls origin/main

### Requirement: Agent state in PR description
Every PR created by the agent SHALL contain an "Agent Status" section at the top of the description as a human-readable markdown table, followed immediately by an HTML comment containing the machine-parseable JSON state. The phase field SHALL be updated at every phase transition.

#### Scenario: State table is human-readable
- **WHEN** a human views the PR description on GitHub
- **THEN** they can read the current phase, issue number, CI fix attempt count, and blocked status without parsing HTML comments

#### Scenario: State comment is machine-parseable
- **WHEN** the agent reads the PR description in Phase 0
- **THEN** it extracts phase, issue, ciFixes, and blocked fields from the `<!-- agent-state: {...} -->` comment
