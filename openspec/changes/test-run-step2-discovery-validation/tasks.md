## 1. Initialize the run

- [ ] 1.1 Run `cd test-manual && make init-run REPO=hao0321-claude-skill-code-cleanup` to scaffold the run directory
- [ ] 1.2 Fill in `TASK.md` with the repo URL (`https://github.com/Hao0321/claude-skill-code-cleanup`) and environment (Claude Code)
- [ ] 1.3 Pre-fill `LOG.md` frontmatter: repo, tier (T1), env, date — do NOT fill in `create-skillet-version:`; confirm it is absent from the pre-session block

## 2. Execute the test session

- [ ] 2.1 Run `make test-start` to start the Docker container
- [ ] 2.2 Run `make prep-run REPO_URL=https://github.com/Hao0321/claude-skill-code-cleanup` to clone the repo into the container
- [ ] 2.2b Create a run-local redacted copy of `AGENT-SUPPLEMENT.md` in the run folder: copy `test-manual/AGENT-SUPPLEMENT.md` and replace the example command on the `send-keys -l` line (currently `"npx create-skillet"`) with a neutral placeholder `"<your-command>"` — this prevents the tmux syntax example from pre-seeding the tool name
- [ ] 2.3 Dispatch a fresh sub-agent with only `TASK.md`, `LOG.md`, and the **redacted** `AGENT-SUPPLEMENT.md` from step 2.2b — no other context, no tool names
- [ ] 2.4 Monitor the session; record in `LOG.md` the first documentation URL or resource the tester accessed (e.g. `https://www.npmjs.com/package/create-skillet`) — or note that the tester invoked the tool name directly without a visible search step

## 3. Grade and document

- [ ] 3.1 Grade all six steps in `TEST-RUN.md`; for Step 2, record whether the tester searched or recalled the tool name, and apply the appropriate grade (pass / soft-pass / fail / "not gradeable — agent recall suspected")
- [ ] 3.2 File any issues found during the run in `issues/` as separate entries
- [ ] 3.3 Run `make test-teardown` to stop and remove the Docker container

## 4. Commit results

- [ ] 4.1 Update `TEST-MATRIX.md` T1 row with the run date and result summary
- [ ] 4.2 Commit the completed run folder (`test-manual/runs/2026-06-25-hao0321-claude-skill-code-cleanup/`) and updated `TEST-MATRIX.md` with a conventional commit message
- [ ] 4.3 Push to the branch
