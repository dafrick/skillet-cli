# Build Prompt: openspec-loop Skill Package

**Working title:** `openspec-loop`
**What it is:** A standalone skillet skill package that implements an autonomous GitHub issue lifecycle agent — unattended, end-to-end, from open issue to review-ready PR.

Use this prompt in a fresh conversation to build the repository from scratch.

---

## Context You Need Before Starting

### What skillet is

Skillet is a CLI skill installer for Claude Code. Skills are npm packages containing a `SKILL.md` file (the skill definition) and a `bin/cli.js` entry point that uses `@skillet-cli/core` as the runtime. Users install skills with:

```bash
npx @skillet-cli/core install <package-name>
```

After installation, the skill is available as a slash command in Claude Code:

```
/openspec-loop
```

The skill package structure is created with `create-skillet` (part of the skillet ecosystem).

### What the skill does

`openspec-loop` is an autonomous GitHub issue lifecycle agent. Each invocation:

1. Checks for in-progress autonomous work to resume
2. If none, picks the best eligible open GitHub issue
3. Creates an isolated git worktree and draft PR
4. Explores the codebase using `/opsx:explore`
5. Creates a structured change proposal using `/opsx:propose`
6. Implements all tasks using `/opsx:apply` with test-driven development
7. Runs an independent code review using a sub-agent
8. Archives the OpenSpec change and marks the PR ready for human review
9. Tears down the worktree and returns to `main`

It is designed to run via Claude Code's `/loop` command:

```
/loop /openspec-loop
```

This is the **critical architectural requirement**: the skill must be invocable as a slash command so that `/loop` re-reads the skill's full instructions on every iteration, preventing instruction drift from context compression. A bare `/loop prompts/some-file.md` does not re-read the file each iteration — the slash command invocation does.

### Why this exists / the differentiator

The autonomous issue agent space is crowded (Devin, OpenHands, GitHub Copilot Coding Agent, LISA, etc.). `openspec-loop` is differentiated by its **structured change management layer**:

- Every issue gets a formal proposal (`proposal.md`), design doc (`design.md`), and task list (`tasks.md`) created via OpenSpec tooling before a line of code is written
- The PR carries a machine-parseable agent state block that tracks phase, CI fix attempts, and blocked status
- The agent has explicit phase gates and stopping conditions rather than an unconstrained implementation loop
- Full traceability: the OpenSpec artifacts archive alongside the implementation

The OpenSpec skills (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`) are assumed to be installed separately. `openspec-loop` orchestrates them; it does not replace them.

---

## Task: Build the Repository

### Step 1: Create the GitHub repository

Create a new public GitHub repository named `openspec-loop`. Initialize it with a README. Clone it locally.

### Step 2: Scaffold the skill package

From inside the cloned repo, run `create-skillet` to scaffold it as a skillet skill package:

```bash
npx create-skillet
```

When prompted:
- **Package name:** `openspec-loop`
- **Version:** `0.1.0`
- **Description:** `Autonomous GitHub issue lifecycle agent — from open issue to review-ready PR, unattended`
- **Skill content path:** `skill/`

This creates `package.json`, `bin/cli.js`, and the `skill/` directory.

### Step 3: Write the SKILL.md

Create `skill/SKILL.md` with the full agent instructions below. This file IS the skill — it is what gets loaded when a user invokes `/openspec-loop` in Claude Code.

**Important constraints for the SKILL.md content:**

- The file must begin with a `<SUBAGENT-STOP>` block so that sub-agents spawned by the skill do not accidentally recurse into it
- Every iteration must start by re-reading its own instructions (Phase 0 prerequisite)
- The OpenSpec skills (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`) are invoked via the `Skill` tool — the SKILL.md must specify this explicitly
- Phase transitions must update the PR description's agent-state block

---

## SKILL.md Content

```markdown
---
name: openspec-loop
description: Autonomous GitHub issue lifecycle agent. Picks an open issue, explores it, proposes a structured change via OpenSpec, implements with TDD, reviews, and delivers a PR — unattended.
---

<SUBAGENT-STOP>
If you were dispatched as a sub-agent, do not run this skill. Exit immediately.
</SUBAGENT-STOP>

# openspec-loop

Autonomous GitHub issue lifecycle agent. Each invocation runs one complete issue
lifecycle: assess → triage → workspace → explore → propose → implement → review →
wrap-up → teardown.

Run via:
```
/loop /openspec-loop
```

The `/loop` invocation ensures this skill is re-read in full on every iteration.
Never run this as `/loop prompts/some-file.md` — that pattern does not re-read
the instructions after context compression.

---

## Prerequisites

The following must be present. This agent does not install them.

- **OpenSpec skills** — `/opsx:explore`, `/opsx:propose`, `/opsx:apply`,
  `/opsx:archive` installed and available (install via `skillet`)
- **Superpowers skills** — `superpowers:using-git-worktrees`,
  `superpowers:test-driven-development`, `superpowers:requesting-code-review`
- **`gh` CLI** — authenticated with write access to the target repository
- **Git** — working tree clean on `main` before starting

---

## Agent State Schema

Every PR created by this agent MUST include an **Agent Status** section at the
very top of the PR description. This section is both human-readable and
machine-parseable.

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

### Phase values

| Phase | Meaning |
|-------|---------|
| `WORKSPACE` | Branch and worktree created |
| `EXPLORE` | Exploration in progress |
| `NEEDS-INPUT` | Blocked — open questions posted, awaiting human |
| `PROPOSE` | OpenSpec proposal created |
| `IMPLEMENT` | Implementation in progress |
| `REVIEW` | Code review in progress |
| `COMPLETE` | Done, PR ready for human review |
| `CI-BLOCKED` | CI failed 3 times, needs human intervention |

### Parsing agent state

```bash
# Extract from PR body:
echo "$PR_BODY" | grep -o '<!-- agent-state: {.*} -->' \
  | sed 's/<!-- agent-state: //;s/ -->//'
# Then: jq '.phase', jq '.issue', jq '.ciFixes', jq '.blocked'
```

---

## Phase 0: Assess State

**Run at the start of every invocation, before any other work.**

1. Fetch open PRs with agent-state markers:
   ```bash
   gh pr list --state open --json number,title,body,headRefName \
     | jq '[.[] | select(.body | contains("<!-- agent-state:"))]'
   ```

2. For each found PR, extract and evaluate state:
   - `blocked: true` or phase `NEEDS-INPUT` / `CI-BLOCKED` → **skip**
   - `blocked: false` and phase is `WORKSPACE`, `EXPLORE`, `PROPOSE`,
     `IMPLEMENT`, or `REVIEW` → **resume** from that phase
   - Phase `COMPLETE` → skip

3. If a resumable PR is found: read its PR number, branch, and issue number.
   Jump directly to the indicated phase. Do not re-run earlier phases.

4. If no resumable PR: proceed to Phase 1.

---

## Phase 1: Triage

**Only reached when Phase 0 finds no resumable work.**

1. Fetch open issues:
   ```bash
   gh issue list --state open --json number,title,body,labels,comments \
     --limit 50
   ```

2. An issue is eligible only if it passes **all three** criteria:

   **Criterion 1 — Clear enough to act on**
   - Problem is described (bug: reproduction + expected vs actual;
     feature: what it should do)
   - Enough information to implement without guessing

   **Criterion 2 — No unanswered clarification requests**
   - `gh issue view <N> --json comments`
   - No open questions from author or maintainers awaiting a response

   **Criterion 3 — Bounded scope**
   - No major architectural decisions required
   - Contained to a bounded area of the codebase
   - No new external dependencies requiring architectural review

3. Dedup check — confirm no open PR references this issue:
   ```bash
   gh pr list --state open --json number,title,body \
     | jq '[.[] | select(.body | test("#<N>([^0-9]|$)"))]'
   git branch -r | grep -E "fix/<N>-|feat/<N>-"
   ```
   If found → skip this issue.

4. Pick the issue with the highest impact and lowest effort. Bugs with clear
   reproduction steps and narrowly scoped enhancements are preferred.

5. If no eligible issues exist: stop. Do not schedule a wakeup sooner than
   1 hour.

---

## Phase 2: Workspace Setup

1. Ensure `main` is current:
   ```bash
   git checkout main && git pull origin main
   ```

2. Create branch name:
   - Format: `fix/<N>-<slug>` for bugs, `feat/<N>-<slug>` for enhancements
   - `<slug>` is 3–5 kebab-case words from the issue title

3. Use the `superpowers:using-git-worktrees` skill to create and enter a worktree
   on the new branch:
   ```
   Invoke skill: superpowers:using-git-worktrees
   ```

4. Create an empty initial commit and push:
   ```bash
   git commit --allow-empty -m "chore: initialize workspace for #<N>"
   git push -u origin <branch>
   ```

5. Create a draft PR with the agent-state template (phase: `WORKSPACE`):
   ```bash
   gh pr create --draft \
     --title "<type>: <issue title summary> (closes #<N>)" \
     --body "..."
   ```
   Record the PR number.

---

## Phase 3: Explore

1. Read the full issue:
   ```bash
   gh issue view <N> --json title,body,comments,labels
   ```

2. Invoke `/opsx:explore` via the Skill tool:
   ```
   Skill({ skill: "opsx:explore", args: "Issue #<N>: <issue title>\n\n<issue body>" })
   ```

3. Update PR phase to `EXPLORE`.

4. Assess critical open questions. A question is critical if answering it
   would change the implementation approach, affect the public API, or
   require a decision only the maintainer can make.

5. If critical questions exist:
   - Add an `## Open Questions` section to the PR description
   - Update agent-state to `NEEDS-INPUT`, `blocked: true`
   - Comment on the PR tagging the maintainer
   - **Stop.** Jump to Phase 8 (Teardown).

6. If no critical questions: proceed to Phase 4.

---

## Phase 4: Propose

1. Invoke `/opsx:propose` via the Skill tool:
   ```
   Skill({ skill: "opsx:propose", args: "fix-<N>-<slug>" })
   ```

2. Update PR phase to `PROPOSE`.

3. Commit the OpenSpec artifacts and push:
   ```bash
   git add openspec/changes/fix-<N>-<slug>/
   git commit -m "chore(openspec): add change proposal for #<N>"
   git push origin <branch>
   ```

4. Review the proposal with a low-stakes code review:
   ```
   Skill({ skill: "opsx:apply", args: "fix-<N>-<slug>" })
   ```
   Wait — use the review to validate scope and task list, not to implement yet.

   Actually: spawn an independent Agent to review the proposal artifacts only:
   ```
   Agent({
     prompt: "Review the OpenSpec proposal at openspec/changes/fix-<N>-<slug>/.
              Are the scope, design, and task list correct and complete for
              resolving GitHub issue #<N>? Report any gaps or corrections.
              Do not implement anything."
   })
   ```
   Apply any reasonable in-scope corrections. Commit and push if changed.

---

## Phase 5: Implement

1. Update PR phase to `IMPLEMENT`.

2. Invoke `/opsx:apply` via the Skill tool:
   ```
   Skill({ skill: "opsx:apply", args: "fix-<N>-<slug>" })
   ```
   When implementing each task, invoke `superpowers:test-driven-development`
   to write failing tests before implementation code.

3. **Per-task attempt cap**: if any single task fails after 3 attempts without
   local tests passing, stop Phase 5. Post a PR comment explaining what was
   tried. Update agent-state to `CI-BLOCKED`, `blocked: true`. Jump to Phase 8.

4. Commit after each logical unit of work:
   ```bash
   git add <files>
   git commit -m "<type>(<scope>): <description>"
   git push origin <branch>
   ```

5. **CI monitoring** after each push:
   ```bash
   gh pr checks <PR> --watch --interval 30
   ```
   Wait for all checks to complete before continuing.

6. **CI fix cycle** (tracked in `ciFixes`; resets at Phase 6):
   - CI passes → continue
   - CI fails → increment `ciFixes` in agent-state, inspect failure, fix,
     commit, push, wait
   - `ciFixes` reaches 3 → post CI-blocked comment, update agent-state to
     `CI-BLOCKED` with `blocked: true`, jump to Phase 8

7. When all tasks in `tasks.md` are checked off and CI passes → Phase 6.

---

## Phase 6: Code Review

1. Update PR phase to `REVIEW`. Reset `ciFixes` to 0 in agent-state.

2. Mark PR as ready (remove draft):
   ```bash
   gh pr ready <PR>
   ```

3. Spawn an independent review sub-agent with no prior context:
   ```
   Agent({
     subagent_type: "claude",
     prompt: "Use the superpowers:requesting-code-review skill to review PR #<PR>
              in this repository. Report all findings — correctness bugs,
              simplification opportunities, scope violations. Do not fix anything."
   })
   ```

4. For each finding:
   - In scope and correct → implement it
   - Out of scope → skip, note in PR comment
   - Unclear → make a reasonable call; if design-level, leave for human

5. Commit and push accepted changes:
   ```bash
   git commit -m "fix: address code review findings for #<N>"
   git push origin <branch>
   ```

6. CI fix cycle (same rules as Phase 5, `ciFixes` reset to 0 at start of this
   phase). On 3rd failure → CI-blocked, jump to Phase 8.

7. CI passes → Phase 7.

---

## Phase 7: Wrap-up

1. **Update the full PR description** to reflect all changes. Include:
   - Summary of what changed and why (linked to issue)
   - Notable implementation decisions
   - Test plan
   - Update agent-state to `COMPLETE`, `blocked: false`

2. **Review OpenSpec artifacts** for accuracy:
   - All tasks checked off
   - Proposal reflects what was actually implemented (update if scope changed)
   - Design reflects actual decisions (update if implementation diverged)
   - Commit and push any updates

3. **Archive the OpenSpec change** via the Skill tool:
   ```
   Skill({ skill: "opsx:archive", args: "fix-<N>-<slug>" })
   ```
   Commit and push the archive:
   ```bash
   git add openspec/
   git commit -m "chore(openspec): archive change for #<N>"
   git push origin <branch>
   ```

4. **Assign the reviewer** (replace with actual maintainer handle):
   ```bash
   gh pr edit <PR> --add-reviewer <maintainer-github-handle>
   ```

5. Proceed to Phase 8.

---

## Phase 8: Teardown

**Always runs** — on success, NEEDS-INPUT stop, or CI-BLOCKED stop.

1. Exit the worktree using the `ExitWorktree` tool (keep the branch — the PR
   is still open):
   ```
   ExitWorktree({ action: "keep" })
   ```

2. Check out `main` and pull:
   ```bash
   git checkout main && git pull origin main
   ```

3. The iteration is complete. If running via `/loop`, schedule the next wakeup:
   - Active issue queue: 30 minutes
   - No eligible issues found this run: 2 hours

---

## Stopping Conditions

Stop the loop (do not schedule a wakeup) when:
- All open issues are either in-flight or ineligible
- `gh` authentication has expired
- A NEEDS-INPUT or CI-BLOCKED state was entered (agent paused, human needed)

Leave a clear terminal message explaining why the loop stopped.
```

---

### Step 4: Repository structure

The final repository should look like this:

```
openspec-loop/
├── package.json          # name: "openspec-loop", bin: "./bin/cli.js"
├── bin/
│   └── cli.js            # generated by create-skillet, uses @skillet-cli/core
├── skill/
│   └── SKILL.md          # the full agent instructions above
└── README.md             # install instructions + usage
```

### Step 5: README content

The README should cover:

1. **What it does** — one paragraph: autonomous issue lifecycle agent, explores before it builds, specs before it codes, leaves an OpenSpec artifact trail
2. **Prerequisites** — the OpenSpec skills, superpowers skills, `gh` CLI
3. **Install**:
   ```bash
   npx @skillet-cli/core install openspec-loop
   ```
4. **Usage**:
   ```
   /loop /openspec-loop
   ```
   With a note explaining why `/loop /openspec-loop` (slash command form) is required rather than `/loop prompts/auto-issue.md` (file reference form): the slash command form re-reads the full skill instructions on every iteration, preventing instruction drift after context compression.
5. **Configuration** — a section on setting the reviewer GitHub handle (either as a constant in the skill or via a config file)
6. **Limitations** — this skill orchestrates other skills; OpenSpec skills must be separately installed; designed for Claude Code only

### Step 6: Publish

Once the skill is ready:

```bash
npm publish --access public
```

Users install it with:

```bash
npx @skillet-cli/core install openspec-loop
```

---

## Key Design Decisions to Preserve

These were arrived at through testing and should not be changed without good reason:

1. **Slash command invocation over file reference** — `/loop /openspec-loop` not `/loop prompts/auto-issue.md`. The slash command pattern forces the skill to be re-read on every loop iteration. The file reference pattern causes the agent to operate from a compressed memory of the instructions after context compression, which causes it to skip the OpenSpec phases.

2. **`<SUBAGENT-STOP>` guard** — prevents sub-agents spawned during review from accidentally self-invoking the skill.

3. **Draft PR created in Phase 2 (workspace)** — not after implementation. The draft PR is the state-tracking artifact. Creating it early means the agent can always resume from a crash.

4. **`ciFixes` resets at Phase 6** — the counter tracks attempts *per phase*, not cumulative. This prevents the agent from being blocked on Phase 6 by failures that happened in Phase 5.

5. **OpenSpec archive happens in Phase 7 (wrap-up), not after merge** — the artifacts are committed to the PR branch so they're part of the PR review and the git history of the feature branch.

6. **Independent sub-agent for code review** — the reviewer agent is spawned with no prior context so it derives everything from the PR itself. This prevents the main agent's implementation bias from contaminating the review.
