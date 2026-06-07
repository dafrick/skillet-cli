# Auto Issue Agent

Autonomous GitHub issue lifecycle agent. Picks an open issue, implements it end-to-end, and delivers a review-ready PR — unattended.

Use with Claude Code `/loop` (self-paced) or `/schedule`.

---

## Prerequisites

The following must be present before running this prompt. This agent does **not** auto-install any of them.

- **OpenSpec skills** — `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive` must be available (install via `skillet`)
- **Superpowers skills** — `superpowers:using-git-worktrees`, `superpowers:test-driven-development`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion` must be available
- **`gh` CLI** — authenticated with write access to this repository (`gh auth status` should show the repo)
- **Git** — working tree is clean on `main` before starting

---

## Usage

```
/loop prompts/auto-issue.md
```

Each iteration runs a full issue lifecycle: assess → triage → workspace → explore → propose → implement → review → wrap-up → teardown. The loop is self-paced; schedule the next wakeup after teardown.

---

## Agent State Schema

Every PR created by this agent MUST include an **Agent Status** section at the very top of the PR description. This section is both human-readable and machine-parseable.

### PR Description Template

```markdown
## Agent Status

| Field | Value |
|-------|-------|
| Phase | <PHASE> |
| Issue | #<N> |
| CI Fix Attempts | <n> / 3 |
| Blocked | <Yes / No> |

<!-- agent-state: {"phase":"<PHASE>","issue":<N>,"ciFixes":<n>,"blocked":<true/false>} -->

---

<rest of PR description>
```

### Phase Values

| Phase | Meaning |
|-------|---------|
| `WORKSPACE` | Branch and worktree created, ready to explore |
| `EXPLORE` | Exploration in progress |
| `NEEDS-INPUT` | Blocked — open questions posted, awaiting human response |
| `PROPOSE` | OpenSpec proposal created |
| `IMPLEMENT` | Implementation in progress |
| `REVIEW` | Code review in progress |
| `COMPLETE` | All phases done, PR ready for human review |
| `CI-BLOCKED` | CI failed 3 times, awaiting human intervention |

### Parsing State

**Primary** — extract the JSON from the HTML comment:
```bash
# From PR body text, grep for the comment line:
echo "$PR_BODY" | grep -o '<!-- agent-state: {.*} -->' | sed 's/<!-- agent-state: //;s/ -->//'
# Parse with: jq '.phase', jq '.issue', jq '.ciFixes', jq '.blocked'
```

**Fallback** — if the HTML comment is absent, read the markdown table:
- `Phase` row → current phase string
- `Issue` row → issue number (strip `#`)
- `CI Fix Attempts` row → first number before ` / 3`
- `Blocked` row → `Yes` → `true`, `No` → `false`

---

## Phase 0: Assess State

> Run at the start of every iteration before any other work.

**Goal**: Determine whether there is in-progress autonomous work to resume, or whether to triage a new issue.

### Steps

1. Fetch all open PRs that contain the agent-state marker:
   ```bash
   gh pr list --state open --json number,title,body,headRefName \
     | jq '[.[] | select(.body | contains("<!-- agent-state:"))]'
   ```

2. For each found PR, extract the agent-state JSON (see parsing instructions above).

3. Evaluate each PR in order:
   - If `blocked: true` or `phase` is `NEEDS-INPUT` or `CI-BLOCKED` → **skip** this PR
   - If `blocked: false` and phase is actionable (`WORKSPACE`, `EXPLORE`, `PROPOSE`, `IMPLEMENT`, `REVIEW`) → **resume** this PR starting from that phase
   - If `phase` is `COMPLETE` → skip (already done, human has it)

4. **If a resumable PR is found**: read the PR number, branch name, and issue number from the state, then jump directly to the phase indicated. Do not re-run earlier phases.

5. **If no resumable PR is found**: proceed to Phase 1 (triage a new issue).

---

## Phase 1: Triage

> Only reached when Phase 0 finds no resumable work.

**Goal**: Select the best open GitHub issue to implement autonomously.

### Steps

1. Fetch all open issues with full detail:
   ```bash
   gh issue list --state open --json number,title,body,labels,comments \
     --limit 50
   ```

2. For each issue, check all three criteria. An issue must pass **all three** to be eligible:

   **Criterion 1 — Clear enough to act on**
   - The issue body describes the problem (for bugs: reproduction steps + expected vs actual behavior; for features: what it should do)
   - There is enough information to implement without guessing

   **Criterion 2 — No unanswered clarification requests**
   - Fetch issue comments: `gh issue view <N> --json comments`
   - No comments from the issue author or maintainers that are open questions awaiting a response
   - If someone asked "can you clarify X?" and it was not answered → skip

   **Criterion 3 — Minor change scope**
   - The change does not require major architectural decisions
   - It is likely contained to a bounded area of the codebase (not a cross-cutting rewrite)
   - No new external dependencies that would require architectural review

3. **Dedup check** — before selecting, confirm no existing open PR references this issue:
   ```bash
   gh pr list --state open --json number,title,body \
     | jq '[.[] | select(.body | test("#<N>([^0-9]|$)"))]'
   ```
   Also check branch names:
   ```bash
   git branch -r | grep -E "fix/<N>-|feat/<N>-"
   ```
   If a match is found → this issue is already in flight, skip it.

4. From eligible issues, **pick the one with the highest impact and lowest effort** based on the issue description. Bugs with clear reproduction steps and narrowly scoped enhancements are preferred.

5. Record the selected issue number `N` and type (`bug` → `fix`, `enhancement` → `feat`). Proceed to Phase 2.

6. **If no eligible issues exist**: stop this iteration. Do not schedule a new wakeup immediately — wait at least 1 hour before retrying.

---

## Phase 2: Workspace Setup

> Create an isolated branch and worktree before any exploration or code changes.

**Goal**: Branch from latest `origin/main` and enter an isolated worktree.

### Steps

1. Ensure you are on `main` and it is up to date:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create the branch name:
   - Format: `fix/<N>-<slug>` for bugs, `feat/<N>-<slug>` for enhancements
   - `<slug>` is a short kebab-case summary of the issue title (3–5 words)
   - Examples: `fix/36-spurious-dep-warning`, `feat/35-default-install-target`

3. Use the `superpowers:using-git-worktrees` skill to create and enter a worktree on the new branch:
   ```
   Invoke skill: superpowers:using-git-worktrees
   ```
   The worktree should be created from the latest `main` commit.

4. Create an empty initial commit and push the branch so GitHub can create the PR:
   ```bash
   git commit --allow-empty -m "chore: initialize workspace for #<N>"
   git push -u origin <branch>
   ```

5. Create the PR immediately (as a draft) to establish state tracking. Use the Agent Status template:
   ```bash
   gh pr create \
     --draft \
     --title "fix: <issue title summary> (closes #<N>)" \
     --body "$(cat <<'EOF'
   ## Agent Status

   | Field | Value |
   |-------|-------|
   | Phase | WORKSPACE |
   | Issue | #<N> |
   | CI Fix Attempts | 0 / 3 |
   | Blocked | No |

   <!-- agent-state: {"phase":"WORKSPACE","issue":<N>,"ciFixes":0,"blocked":false} -->

   ---

   Autonomous implementation of #<N>. See issue for details.
   EOF
   )"
   ```

6. Record the PR number for use in subsequent phases.

---

## Phase 3: Explore

> Understand the problem before proposing a solution.

**Goal**: Use `/opsx:explore` to understand the issue, then decide whether critical open questions block autonomous implementation.

### Steps

1. Read the full issue body and comments:
   ```bash
   gh issue view <N> --json title,body,comments,labels
   ```

2. Invoke `/opsx:explore` with the issue context:
   ```
   /opsx:explore Issue #<N>: <issue title>

   <paste issue body here>
   ```
   Explore the codebase as needed to understand the problem and identify a solution.

3. Update the PR phase to `EXPLORE`:
   ```bash
   gh pr edit <PR> --body "$(updated body with phase: EXPLORE)"
   ```

4. **Assess critical open questions**: A question is *critical* if answering it would change the implementation approach, affect the public API, or require a decision only the maintainer can make. Examples of critical questions:
   - "Should this be a breaking change or maintain backwards compatibility?"
   - "Which of these two conflicting behaviors is the intended one?"
   - "This fix would change behavior for X — is that acceptable?"

   Questions that are *not* critical (you can make a reasonable call):
   - Implementation details with multiple valid approaches
   - Code style choices within the existing conventions
   - Minor wording choices

5. **If critical open questions exist**:
   - Update the PR description to include the questions clearly, formatted as a numbered list under a `## Open Questions` heading
   - Update agent-state to `NEEDS-INPUT` with `blocked: true`:
     ```bash
     gh pr edit <PR> --body "$(updated body with phase: NEEDS-INPUT, blocked: true)"
     ```
   - Add a PR comment tagging the maintainer:
     ```bash
     gh pr comment <PR> --body "@dafrick — this issue has open questions that need your input before I can proceed. See the Open Questions section above."
     ```
   - **Stop this phase.** Jump to Phase 8 (Teardown).

6. **If no critical open questions**: proceed to Phase 4.

---

## Phase 4: Propose

> Create a formal OpenSpec change proposal for the implementation plan.

**Goal**: Produce a well-scoped proposal, have it reviewed, and commit it to the branch.

### Steps

1. Invoke `/opsx:propose` with context from the exploration:
   ```
   /opsx:propose <kebab-case-change-name>
   ```
   Use the issue number and a short slug as the change name (e.g., `fix-36-spurious-dep-warning`).

2. Update the PR phase to `PROPOSE`:
   ```bash
   gh pr edit <PR> --body "$(updated body with phase: PROPOSE)"
   ```

3. Commit all generated OpenSpec artifacts and push:
   ```bash
   git add openspec/changes/<change-name>/
   git commit -m "chore(openspec): add change proposal for #<N>"
   git push origin <branch>
   ```

4. Run `/code-review` on the proposal artifacts:
   ```
   /code-review low openspec/changes/<change-name>/
   ```
   Implement all reasonable in-scope suggestions (corrections to scope, missing requirements, unclear tasks). Ignore suggestions that are out of scope for the issue.

5. If changes were made, commit and push:
   ```bash
   git add openspec/changes/<change-name>/
   git commit -m "chore(openspec): refine proposal for #<N> based on review"
   git push origin <branch>
   ```

---

## Phase 5: Implement

> Build the change with test-driven development.

**Goal**: Implement all tasks from the OpenSpec change, with passing CI.

### Steps

1. Update the PR phase to `IMPLEMENT`:
   ```bash
   gh pr edit <PR> --body "$(updated body with phase: IMPLEMENT)"
   ```

2. Invoke `/opsx:apply` to begin task-driven implementation. Use TDD sub-agents:
   ```
   /opsx:apply <change-name>
   ```
   When implementing each task, invoke the `superpowers:test-driven-development` skill to write tests before implementation code.

3. **Commit frequently** — after each logical unit of work (completing a task group or a meaningful set of changes):
   ```bash
   git add <files>   # stage the relevant changed files explicitly
   git commit -m "<type>(<scope>): <description>"
   git push origin <branch>
   ```

4. **Monitor CI** after each push:
   ```bash
   gh pr checks <PR> --watch --interval 30
   ```
   Wait for all checks to complete before proceeding.

5. **CI fix cycle** (tracked across this phase; resets at Phase 6):
   - If CI passes → continue to next task group
   - If CI fails:
     - Increment the `ciFixes` counter in the agent-state (update PR description)
     - Inspect the failure: `gh run list --branch <branch> --limit 1 --json databaseId | jq -r '.[0].databaseId'` then `gh run view <id> --log-failed`
     - Apply a targeted fix, commit, and push
     - Wait for CI again
   - **If `ciFixes` reaches 3**:
     - Post a PR comment with a full summary of the failures and each fix attempted:
       ```bash
       gh pr comment <PR> --body "## CI Blocked

       After 3 fix attempts, CI is still failing. Human intervention needed.

       ### Failures and attempts
       <summary of each failure and what was tried>

       @dafrick — please review the CI output and advise."
       ```
     - Update agent-state to `CI-BLOCKED` with `blocked: true`
     - **Stop.** Jump to Phase 8 (Teardown).

6. Once all tasks in `tasks.md` are checked off and CI is passing, proceed to Phase 6. The `ciFixes` counter will be reset to 0 as part of the Phase 6 state transition.

---

## Phase 6: Code Review

> Independent review of the full PR by a sub-agent with no prior context.

**Goal**: Catch correctness issues and improvement opportunities using a fresh perspective.

### Steps

1. Update the PR phase to `REVIEW` and reset `ciFixes` to 0 (the counter tracks attempts per phase, not cumulative):
   ```bash
   gh pr edit <PR> --body "$(updated body with phase: REVIEW, ciFixes: 0, blocked: false)"
   ```

2. Mark the PR as ready for review (remove draft status):
   ```bash
   gh pr ready <PR>
   ```

3. Invoke the `superpowers:requesting-code-review` skill as an **independent sub-agent** — pass only the PR number so the reviewer derives all context from the PR itself. Use the Agent tool to ensure a clean context window:
   ```
   Agent(
     subagent_type="claude",
     prompt="Use the superpowers:requesting-code-review skill to review PR #<PR> in the skillet repository. Report all findings — correctness bugs, simplification opportunities, and anything out of scope for the issue. Do not fix anything."
   )
   ```

4. Review the sub-agent's findings. For each finding, assess:
   - **In scope and correct** → implement it
   - **Out of scope** (would change behavior beyond the issue) → skip, note in PR comment
   - **Unclear** → make a reasonable call; if the finding would substantially change the design, leave it for the human reviewer

5. Implement all accepted in-scope changes. Commit and push:
   ```bash
   git commit -m "fix: address code review findings for #<N>"
   git push origin <branch>
   ```

6. **CI fix cycle** (3 attempts, same rules as Phase 5 — `ciFixes` was reset to 0 at the start of this phase):
   - Monitor CI: `gh pr checks <PR> --watch --interval 30`
   - On failure: inspect, fix, commit, push, repeat up to 3 times
   - On 3rd failure: post CI-blocked comment (same format as Phase 5), set state to `CI-BLOCKED`, jump to Phase 8

7. Once CI passes, proceed to Phase 7.

---

## Phase 7: Wrap-up

> Finalise the PR and hand off to the human reviewer.

**Goal**: Accurate PR description, up-to-date OpenSpec artifacts, archived change, reviewer assigned.

### Steps

1. **Update the PR description** to reflect all changes made. The description should include:
   - Summary of what was changed and why (linked to the issue)
   - Notable implementation decisions
   - Test plan (what was tested, how to verify)
   - Update agent-state to `COMPLETE`:
     ```bash
     gh pr edit <PR> --body "$(full updated description with phase: COMPLETE, blocked: false)"
     ```

2. **Review OpenSpec artifacts** for accuracy — read `proposal.md`, `design.md`, `tasks.md` and check:
   - All tasks are checked off
   - The proposal accurately reflects what was implemented (update if scope changed during implementation)
   - The design reflects actual decisions made (update if implementation diverged from the plan)
   - If any artifacts need updating:
     ```bash
     # edit the artifact, then:
     git add openspec/changes/<change-name>/
     git commit -m "chore(openspec): update artifacts to reflect final implementation of #<N>"
     git push origin <branch>
     ```

3. **Archive the OpenSpec change**:
   ```
   /opsx:archive <change-name>
   ```
   Commit and push the archive:
   ```bash
   git add openspec/
   git commit -m "chore(openspec): archive change for #<N>"
   git push origin <branch>
   ```

4. **Assign the reviewer**:
   ```bash
   gh pr edit <PR> --add-reviewer dafrick
   ```

5. Proceed to Phase 8.

---

## Phase 8: Teardown

> Always runs — on success, on NEEDS-INPUT stop, or on CI-BLOCKED stop.

**Goal**: Return to a clean, up-to-date `main` so the next iteration starts from good state.

### Steps

1. Exit the worktree and return to the main working directory. Use the `ExitWorktree` tool if available, otherwise:
   ```bash
   cd <repo-root>
   ```

2. Remove the worktree to avoid accumulation:
   ```bash
   git worktree remove <worktree-path>
   ```
   If the worktree has uncommitted changes (e.g., a mid-run interrupt), add `--force` to remove it anyway and rely on the PR branch for recovery.

3. Check out `main`:
   ```bash
   git checkout main
   ```

4. Pull the latest from origin:
   ```bash
   git pull origin main
   ```

5. The iteration is complete. If using `/loop` with self-paced scheduling, schedule the next wakeup now. A 30-minute interval is reasonable for active issue queues; 2 hours if no eligible issues were found this run.

---

## Stopping Conditions

Stop the loop (do not schedule a wakeup) when:
- All open issues are either in-flight (have open agent PRs) or ineligible
- A critical unrecoverable error occurs (e.g., `gh` authentication expired)

In either case, leave a note in the terminal output explaining why the loop stopped.
