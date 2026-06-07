## 1. Makefile — container setup

- [x] 1.1 Add `git` to the `apt-get install` block in the `test-start` target alongside Node 24
- [x] 1.2 Add `prep-run` target: derive slug using `org-repo` format (last two URL path components joined with `-`, matching `init-run`'s convention), run `docker exec $(CONTAINER) bash -c "mkdir -p /repo && git clone $(REPO_URL) /repo/<slug>"`, error with usage message if `REPO_URL` is unset

## 2. TASK.md template — pre-cloned repo

- [x] 2.1 Add a "What You Have Access To" note in `TASK.md.template` stating that the repository has been pre-cloned and giving the path inside the container (`/repo/<slug>`, where `<slug>` matches the repo name)
- [x] 2.2 Remove any implication that the test user needs to clone the repo themselves

## 3. LOG.md template — comment structure

- [x] 3.1 Restructure `LOG.md.template` so the format-examples block is in a self-contained `<!-- ... -->` comment that is fully closed before the append region (`<!-- Append entries below. -->` marker)
- [x] 3.2 Remove the blank line between the closing `-->` of the format-examples block and `<!-- Append entries below. -->` so the two comment blocks are adjacent — this eliminates the ambiguous insertion zone where a user reading in raw mode might start writing before reaching the marker
- [x] 3.3 Verify that the append region is outside any HTML comment by checking that a line appended immediately after the marker renders as visible Markdown

## 4. AGENT-SUPPLEMENT.md — script path and log entry format

- [x] 4.1 Replace `./scripts/wait-for-text.sh` with the absolute-path resolution pattern: `$(git rev-parse --show-toplevel)/test-manual/scripts/wait-for-text.sh`
- [x] 4.2 Add a brief explanation: the relative path fails when the agent's working directory is not `test-manual/`; agents should always resolve from the repo root
- [x] 4.3 Add a note (e.g., under a "Keeping the log" heading or inline near the LOG.md reference in TASK.md) that log entries are plain-text `HH:MM ...` lines and must not be wrapped in `<!-- -->` HTML comment syntax — the format-examples block uses comment syntax only to hide the examples from rendered output, not as the format for actual entries

## 5. README — checklist and role separation

- [x] 5.1 Rewrite "Before You Start" step 3 to: (a) use mandatory language — "Re-inspect the repo and confirm the tier matches the matrix entry. Correct the matrix entry if it is wrong before proceeding." — and (b) remove the clause "This is pre-session work — the test user clones the repo themselves inside the container," which contradicts the prep-run step being added in 5.2
- [x] 5.2 Add a new "Before You Start" step after `make test-start`: "Run `make prep-run REPO_URL=<url>` to clone the repository into the container."
- [x] 5.3 Add a section in the session flow for coding-agent test users explaining that the test user must be dispatched as an isolated sub-agent (fresh invocation, only TASK.md + LOG.md + AGENT-SUPPLEMENT.md in context), with the reason: prior-run context leaks workaround knowledge and softens failure grades

## 6. Run folder location — tmp/ → runs/

- [x] 6.1 Create `test-manual/runs/.gitkeep` (committed placeholder for the tracked run-artifact directory)
- [x] 6.2 Update `test-manual/Makefile` `init-run` target: change `tmp/` to `runs/` in the `RUN=` assignment
- [x] 6.3 Update `test-manual/README.md`: replace all `tmp/` references with `runs/`
- [x] 6.4 Update `openspec/specs/manual-test-harness/spec.md`: replace `tmp/` references with `runs/`, replace the "tmp/ is gitignored" requirement with "runs/ is committed"
- [x] 6.5 Update `openspec/specs/monorepo-setup/spec.md`: update the gitignore requirement to reflect that `tmp/*` is still excluded but `runs/` is tracked
- Note: `.gitignore` requires no change — `test-manual/tmp/*` remains (tmp stays gitignored as a scratchpad); `runs/` is tracked by default

## 7. Spec update

- [x] 7.1 Run `openspec apply` to merge the delta spec (`specs/manual-test-harness/spec.md`) into `openspec/specs/manual-test-harness/spec.md`
- [x] 7.2 Run `openspec apply` to add the new capability spec (`specs/harness-prep-run/spec.md`) to `openspec/specs/harness-prep-run/spec.md`
