## Context

Claude Code's `/loop` command can run a prompt on a recurring basis with self-paced scheduling. Combined with OpenSpec (`/opsx:*`) and Superpowers skills, it can drive a full issue lifecycle — from triage through merged PR — unattended. The prompt file is the only artifact; there are no code changes to the skillet CLI itself.

The key challenge is **resumability**: a loop run may be interrupted, CI may fail, or an issue may need human input. The design must ensure each run can detect where it left off and continue safely without re-doing expensive work.

## Goals / Non-Goals

**Goals:**
- A single Markdown prompt file that works with `/loop` or `/schedule`
- Self-contained state tracking via the PR description (no external state files)
- Safe resumption — each run detects in-progress work and one-shots forward from that phase
- Clear human-readable status in every PR this agent creates
- Graceful handling of blockers: CI failures (max 3 retries), open questions (NEEDS-INPUT state)

**Non-Goals:**
- Auto-installing OpenSpec or Superpowers (prerequisites are assumed present)
- Handling issues that require major architecture changes
- Parallel issue implementation (one active issue per loop run)

## Decisions

### D1: State lives in the PR description, not a file

**Decision**: Track phase state in a structured section of the PR description body.

**Format**: Human-readable markdown table at the top of every PR, backed by an HTML comment for reliable machine parsing:

```markdown
## Agent Status

| Field | Value |
|-------|-------|
| Phase | IMPLEMENT |
| Issue | #36 |
| CI Fix Attempts | 1 / 3 |
| Blocked | No |

<!-- agent-state: {"phase":"IMPLEMENT","issue":36,"ciFixes":1,"blocked":false} -->
```

**Why over a state file**: The PR is the natural artifact of the work. State in the PR description is visible to human reviewers, survives worktree deletion, and requires no extra tracking infrastructure. The HTML comment gives the agent a fast, reliable parse path; the markdown table is the fallback if the comment is absent.

**Alternative considered**: `prompts/state.json` — rejected because it requires committing state to the branch (noisy, merge-conflict-prone) and is invisible in the GitHub UI.

### D2: Phase ordering — workspace before explore

**Decision**: Create the branch/worktree in Phase 2, before running `/opsx:explore` in Phase 3.

**Why**: Explore may produce a PR (when critical questions are found). Creating a PR requires being on a named branch. The worktree setup must happen first so explore has a branch to push to if needed.

### D3: Issue selection criteria

**Decision**: Score issues on three axes, all required:
1. **Clear enough to act on** — issue body describes the problem and expected behavior
2. **No open questions** — no unanswered comments requesting clarification from the reporter
3. **Minor change scope** — no major architecture changes; likely touches a bounded area of the codebase

**Why not file count**: "≤3 files" is too narrow and hard to evaluate pre-exploration. "Minor change scope" is a judgment call but maps naturally to the issue description.

**How to detect in-progress issues**: Check `gh pr list` for open PRs whose body contains the agent-state HTML comment. This avoids re-picking issues already being worked.

### D4: CI retry cap at 3

**Decision**: Attempt CI fixes a maximum of 3 times per phase (implement and review phases separately). On the 3rd failure, post a PR comment explaining what was tried and stop.

**Why 3**: Enough to handle flaky tests and straightforward linting errors; unlikely to spiral on a systematic failure. The human gets a clear explanation rather than an agent stuck in a loop.

### D5: Teardown always removes the worktree and returns to latest main

**Decision**: Phase 8 exits the worktree, removes it with `git worktree remove` (using `--force` if uncommitted changes exist), checks out main, and runs `git pull origin main` unconditionally.

**Why**: Each loop iteration must start from the latest main to avoid branching from stale state. Worktrees must be removed on every exit path — success, NEEDS-INPUT, or CI-BLOCKED — to prevent accumulation. The branch and its PR are the durable artifacts; the worktree is disposable.

### D6: Reviewer assignment

**Decision**: Assign GitHub user `dafrick` as reviewer after wrap-up.

## Risks / Trade-offs

- **Long-running iterations**: A full lifecycle (explore → implement → review → CI) can take 30–90 minutes. If the loop is interrupted mid-run, the next iteration resumes via Phase 0 state detection — but partial commits may exist on the branch.
  → Mitigation: Commit at every phase boundary. The agent can always re-read the branch and PR state to orient itself.

- **Explore produces no PR when questions exist, but branch was created**: If Phase 3 finds critical questions, a PR is created on the empty branch. This is a valid GitHub pattern (draft PR with no code) but may look odd.
  → Mitigation: The PR description explains it is awaiting input (NEEDS-INPUT state). Document this behavior in the prompt.

- **Issues marked NEEDS-INPUT are skipped indefinitely**: If no one responds to the questions, the issue will be skipped on every future run.
  → Mitigation: Out of scope for v1. A future enhancement could re-open issues after a timeout.

- **Sub-agent code review may suggest changes outside scope**: The `/code-review` sub-agent sees only the PR, not the original issue constraints.
  → Mitigation: The prompt instructs the main agent to apply only changes that are within the issue's scope and the OpenSpec proposal's bounds.

## Open Questions

- Should the prompt support a `--dry-run` mode (triage only, no workspace creation)? Not included in v1.
