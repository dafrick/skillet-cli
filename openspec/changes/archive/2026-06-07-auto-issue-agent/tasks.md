## 1. Scaffold

- [x] 1.1 Create `prompts/` directory at repo root
- [x] 1.2 Create `prompts/auto-issue.md` with prerequisites section (OpenSpec, superpowers, gh CLI)

## 2. Phase 0 — State Assessment

- [x] 2.1 Write Phase 0 instructions: search open PRs for `<!-- agent-state:` HTML comment
- [x] 2.2 Write state extraction logic: parse JSON from comment to get phase, issue, ciFixes, blocked
- [x] 2.3 Write resume logic: if found and not blocked, one-shot forward from recorded phase
- [x] 2.4 Write skip logic: if NEEDS-INPUT or blocked, look for another open agent PR or fall through to triage

## 3. Phase 1 — Issue Triage

- [x] 3.1 Write triage instructions: fetch open issues via `gh issue list --json`
- [x] 3.2 Write scoring criteria: clear issue body, no unanswered comments, minor scope, no architecture changes
- [x] 3.3 Write dedup check: verify no existing open PR references the candidate issue number (use regex with word boundary to avoid partial matches)

## 4. Phase 2 — Workspace Setup

- [x] 4.1 Write workspace instructions: `git pull origin main` before branching
- [x] 4.2 Write branch naming rule: `fix/N-slug` for bugs, `feat/N-slug` for enhancements (no `#` in branch name)
- [x] 4.3 Write worktree creation instructions via `superpowers:using-git-worktrees` skill
- [x] 4.4 Write empty initial commit (`git commit --allow-empty`) and push before `gh pr create`

## 5. Phase 3 — Exploration

- [x] 5.1 Write Phase 3 instructions: invoke `/opsx:explore` with the issue body and number
- [x] 5.2 Write question detection instructions: decide if questions are critical (block autonomous work)
- [x] 5.3 Write NEEDS-INPUT branch: create PR with questions in description, set agent-state to NEEDS-INPUT, stop
- [x] 5.4 Write continue branch: proceed to Phase 4 if no critical questions

## 6. Phase 4 — OpenSpec Proposal

- [x] 6.1 Write Phase 4 instructions: invoke `/opsx:propose` with the issue context
- [x] 6.2 Write commit-and-push step after proposal creation
- [x] 6.3 Write code-review step on proposal: `/code-review` on OpenSpec artifacts, implement reasonable changes, commit & push

## 7. Phase 5 — Implementation

- [x] 7.1 Write Phase 5 instructions: invoke `/opsx:apply` with TDD sub-agents (`superpowers:test-driven-development`)
- [x] 7.2 Write frequent-commit instructions: commit after each logical unit using explicit file staging (not `git add -p`), push
- [x] 7.3 Write CI monitoring loop: check CI status after each push, wait for result
- [x] 7.4 Write CI fix cycle: up to 3 attempts — diagnose failure, apply fix, commit & push
- [x] 7.5 Write CI cap behaviour: on 3rd failure post PR comment with failure summary and attempted fixes, stop
- [x] 7.6 Write ciFixes reset: reset `ciFixes` to 0 in agent-state as part of Phase 5 → Phase 6 transition

## 8. Phase 6 — Code Review

- [x] 8.1 Write Phase 6 instructions: invoke `superpowers:requesting-code-review` as independent sub-agent via Agent tool with PR number only (no prior context)
- [x] 8.2 Write change application: implement all reasonable in-scope review suggestions, commit & push
- [x] 8.3 Write CI monitoring + fix cycle (same 3-attempt cap as Phase 5)

## 9. Phase 7 — Wrap-up

- [x] 9.1 Write PR description update step: reflect final changes, confirm agent-state phase set to COMPLETE
- [x] 9.2 Write OpenSpec artifact review: read proposal/design/tasks, update any that are inaccurate, commit & push
- [x] 9.3 Write `/opsx:archive` invocation step
- [x] 9.4 Write reviewer assignment: `gh pr edit --add-reviewer dafrick`

## 10. Phase 8 — Teardown

- [x] 10.1 Write teardown instructions: exit worktree (`ExitWorktree` or equivalent)
- [x] 10.2 Write worktree removal step: `git worktree remove <path>` (with `--force` if uncommitted changes)
- [x] 10.3 Write return-to-main step: `git checkout main`
- [x] 10.4 Write pull step: `git pull origin main`
- [x] 10.5 Confirm teardown runs on every exit path (success, NEEDS-INPUT stop, CI cap stop)

## 11. Agent State Schema

- [x] 11.1 Write the PR description template with human-readable Agent Status table
- [x] 11.2 Write the HTML comment format: `<!-- agent-state: {"phase":"...","issue":N,"ciFixes":N,"blocked":false} -->`
- [x] 11.3 Document fallback: if HTML comment absent, agent reads the markdown table fields

## 12. Verification

- [x] 12.1 Review completed `prompts/auto-issue.md` against all spec scenarios
- [x] 12.2 Confirm prerequisites section is present and accurate
- [x] 12.3 Confirm all 9 phases (0–8) are present with correct ordering (workspace before explore)
- [x] 12.4 Confirm agent-state schema appears in both PR description template and parsing instructions
