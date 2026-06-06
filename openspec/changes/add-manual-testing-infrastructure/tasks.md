## 1. Repo Setup

- [x] 1.1 Create `test-manual/` directory at repo root
- [x] 1.2 Create `test-manual/tmp/.gitkeep`
- [x] 1.3 Add `test-manual/tmp/*` to root `.gitignore` (contents pattern, not directory pattern — keeps `.gitkeep` committable)
- [x] 1.4 Create `test-manual/scripts/` and `test-manual/templates/` directories

## 2. wait-for-text.sh

- [x] 2.1 Create `test-manual/scripts/wait-for-text.sh` adapted from mitsuhiko/agent-stuff: accepts `-S` (socket), `-t` (target), `-p` (pattern), `-T` (timeout, default 15), `-i` (interval, default 0.5), `-F` (fixed string); polls `tmux capture-pane`; exits 0 on match, 1 on timeout with last output to stderr
- [x] 2.2 Make `wait-for-text.sh` executable (`chmod +x`)

## 3. Makefile

- [x] 3.1 Create `test-manual/Makefile` with `CONTAINER`, `SOCKET`, `SESSION`, and `IMAGE` variables (defaults: `skillet-test-container`, `${TMPDIR:-/tmp}/claude-tmux-sockets/skillet.sock`, `skillet-test`, `ubuntu:24.04`)
- [x] 3.2 Add `test-start` target: `mkdir -p` socket dir, `docker run -d --name $(CONTAINER) $(IMAGE) sleep infinity`, `tmux -S "$(SOCKET)" new -d -s $(SESSION)`, send `docker exec -it $(CONTAINER) bash` followed by `Enter` to the session, print the monitor command and the send-keys helper syntax
- [x] 3.3 Add `test-teardown` target: kill tmux session (ignore error if not found), `docker rm -f $(CONTAINER)` (ignore error if not found)
- [x] 3.4 Add both targets to `.PHONY`

## 4. Templates

- [x] 4.1 Create `test-manual/templates/ISSUE.md.template` with fields: title, description (what happened), reproduction steps, how encountered, why it is bad (user impact), severity (critical/high/medium/low), workaround
- [x] 4.2a Create `test-manual/templates/TEST-RUN.md.template` skeleton: session metadata block (repo URL, tier, env, date, tester), seven-step protocol with checkboxes where Step 1 is "Identify the tier" with the five tier definitions table inline, soft-fail log section
- [x] 4.2b Complete `TEST-RUN.md.template`: **edge cases / unhappy paths** section (separate from happy-path steps) covering: no git remote configured, existing `package.json`, missing `SKILL.md`, large skill directory; issues list section (ISS-NNN links with one-line summaries); UX quality observations section; failure taxonomy key (✅ pass, 🟡 soft fail — docs gap, 🟠 soft fail — UX issue, 🔴 hard fail, 🔵 N/A)
- [x] 4.3 Create `test-manual/templates/LOG.md.template`: header with repo, tier, target environment, date, tester, and **Docker base image** fields; brief instruction that entries are append-only (never edit prior entries); a prompt showing the HH:MM entry format with an example ISS-NNN reference

## 5. TEST-MATRIX.md

- [x] 5.1 Create `test-manual/TEST-MATRIX.md` with "Candidate Repos" table (Tier, Repo, Complexity notes, Status) seeded with five repos spanning tiers 1–5: `netresearch/agent-rules-skill` (T1), `netresearch/skill-repo-skill` (T2), `harness/harness-skills` (T3), `addyosmani/agent-skills` (T4), `obra/superpowers` (T5)
- [x] 5.2 Add "Test Run Log" table (Date, Repo, Tier, Env, Outcome, Run folder) with an empty placeholder row

## 6. README.md

- [x] 6.1 Create `test-manual/README.md` — Overview section (what this is, user persona)
- [x] 6.2 Add Prerequisites section (Docker, tmux; note: no Node required on host)
- [x] 6.3 Add "Running a test" section: `make test-start`, then `make test-teardown`; document that the run folder lives at `test-manual/tmp/YYYY-MM-DD-<repo-slug>/` and contains `LOG.md`, `TEST-RUN.md`, and `issues/`
- [x] 6.4 Add seven-step test protocol section with failure taxonomy; include a step for filling in the `env:` field before starting — note that environment choice is up to the tester, with a reminder to vary environments across runs for coverage
- [x] 6.5 Add Tmux Reference section for coding agents: private socket setup, `tmux send-keys` with `-l` flag for literal sends, `tmux capture-pane -p -J -S -200` for reading output (document `-J` joins wrapped lines, `-S -200` reads 200 lines of scrollback), `wait-for-text.sh` usage, `@inquirer/prompts` key sequences (arrow keys, space, Enter, Ctrl+U, Ctrl+C), cleanup
- [x] 6.6 Add "Keeping the log" section: LOG.md is append-only (never rewrite), HH:MM timestamp format, reference ISS-NNN when filing an issue, distinction from TEST-RUN.md (log = narrative trace, test run = structured checklist)
- [x] 6.7 Add "Documenting issues" section: how to name files (ISS-NNN), where they live (`tmp/<run>/issues/`), how to reference from LOG.md

## 7. Verification

- [x] 7.1 Run `make test-start` and confirm container is running and tmux session exists with a bash prompt inside the container
- [x] 7.2 Send a command via `tmux -S "$SOCKET" send-keys` and confirm it runs inside the container
- [x] 7.3 Run `make test-teardown` and confirm container and session are gone
- [x] 7.4 Confirm `git status` shows no untracked files under `test-manual/tmp/` after placing a test file there; confirm `git ls-files test-manual/tmp/.gitkeep` lists the file
- [x] 7.5 Run `wait-for-text.sh` against a live tmux pane that contains the target pattern and confirm exit 0; run it against a pane without the pattern with `-T 3` and confirm exit 1 with pane content printed to stderr

## 8. Post-review restructure

Changes made after initial implementation in response to design review.

### 8.1 Role separation

- [x] 8.1.1 Define Guide and Test user roles in README; document which files each receives
- [x] 8.1.2 Reframe README as guide orientation only — remove step-by-step protocol, failure taxonomy table, and tmux reference

### 8.2 AGENT-SUPPLEMENT.md

- [x] 8.2.1 Create `test-manual/AGENT-SUPPLEMENT.md` with tmux private socket setup, send-keys -l usage, capture-pane flags, wait-for-text.sh usage, @inquirer/prompts key sequences, and cleanup commands
- [x] 8.2.2 Update README to reference AGENT-SUPPLEMENT.md and instruct guide to attach it for coding-agent test users

### 8.3 TASK.md.template

- [x] 8.3.1 Create `test-manual/templates/TASK.md.template` with two tasks (Package the skills, Install the skills) in user-domain language; no expected paths, commands, or taxonomy
- [x] 8.3.2 Template instructs test user to write observations in LOG.md and document clearly when blocked

### 8.4 TEST-RUN.md.template updates

- [x] 8.4.1 Add `version:` field to metadata block
- [x] 8.4.2 Add 🔶 Mid fail — functional issue grade between 🟠 and 🔴 (six-grade taxonomy)
- [x] 8.4.3 Add blockquote at top of protocol directing guide to file issues continuously, not at the end; remove Step 7
- [x] 8.4.4 Reframe Steps 2–6 in guide-observation language (grade/observe/note) rather than as instructions to the test user
- [x] 8.4.5 Remove tier definition table from Step 1; replace with a record field and pointer to README
- [x] 8.4.6 Move expected-paths table (by environment) into Step 6
- [x] 8.4.7 Remove edge cases / unhappy paths section

### 8.5 LOG.md.template updates

- [x] 8.5.1 Add `version:` field to metadata block
- [x] 8.5.2 Reframe as test user's document with first-person format examples and instructions addressed to the test user
- [x] 8.5.3 Update README "Keeping the Log" section to reflect guide-consultable (not guide-authored) ownership

### 8.6 ISSUE.md.template updates

- [x] 8.6.1 Add Expected result and Actual result as distinct fields; rename Reproduction steps to Steps to reproduce

### 8.7 Makefile and README updates

- [x] 8.7.1 Add `init-run REPO=<slug>` target to Makefile; creates run folder and copies TASK, TEST-RUN, LOG templates
- [x] 8.7.2 Add before-you-start checklist to README including TEST-MATRIX consultation and init-run instruction
- [x] 8.7.3 Add tier reference table (T1–T5 plus O tier) to README
- [x] 8.7.4 Add fully-stuck guidance to README Running the Session section
- [x] 8.7.5 Add consultation note to TEST-MATRIX.md

## 9. Post-grapevine-walkthrough fixes

Changes made after a persona-driven walkthrough of the harness identified gaps in the Guide and Test User experience.

### 9.1 Makefile

- [x] 9.1.1 Install Node 24 (via NodeSource `setup_24.x`) inside the container as part of `test-start`; update design Decision 3 rationale
- [x] 9.1.2 Copy `AGENT-SUPPLEMENT.md` into run folder as part of `init-run`

### 9.2 README

- [x] 9.2.1 Fix Prerequisites Node claim: replace "Node is installed inside the container as part of the test setup" with "`make test-start` installs Node 24 inside the container automatically"
- [x] 9.2.2 Clarify Before You Start step 3: "Inspect the repo" (not "Clone the repo"); note this is pre-session work and the test user clones independently inside the container
- [x] 9.2.3 Add `org-repo` slug format convention after step 4 (e.g. `netresearch/agent-rules-skill` → `netresearch-agent-rules-skill`)
- [x] 9.2.4 Add LOG.md frontmatter pre-fill step (new step 6): guide fills all fields except `tester:` before handoff; renumber old step 6 to 7 with updated wording reflecting init-run now copies AGENT-SUPPLEMENT.md
- [x] 9.2.5 Clarify file handoff in Running the Session step 2: Human vs Coding agent paths with concrete mechanics
- [x] 9.2.6 Add observation instructions in Running the Session step 3: coding agent (tmux attach), human (second docker exec or alongside)

### 9.3 TEST-RUN.md.template

- [x] 9.3.1 Rename `version:` to `create-skillet-version:` in frontmatter
- [x] 9.3.2 Reframe Step 1 from "Identify the tier" to "Confirm tier" (pre-session classification, update if assessment changes)
- [x] 9.3.3 Add discoverability guide note to Step 2: test user does not know the tool name; tool discovery is part of what Step 2 measures
- [x] 9.3.4 Add `@skillet-cli/core` npm README link to Step 5 as reference for "available documentation"
- [x] 9.3.5 Scope Step 6 intro to structural verification inside the container (not active-in-agent-environment verification)
- [x] 9.3.6 Add HTML comment above Soft-Fail Log table clarifying it is a quick-scan summary; per-step Outcome fields hold full notes

### 9.4 LOG.md.template

- [x] 9.4.1 Rename `version:` to `create-skillet-version:` in frontmatter (matches TEST-RUN.md.template)
- [x] 9.4.2 Add frontmatter ownership comment: guide pre-fills all fields before handoff; test user fills `tester:` only

### 9.5 AGENT-SUPPLEMENT.md

- [x] 9.5.1 Add cleanup warning blockquote in `## Cleanup` section: teardown is the guide's responsibility (`make test-teardown`); coding agents must not run these commands during the session

### 9.6 TEST-MATRIX.md

- [x] 9.6.1 Add "After completing a run" paragraph to introductory blockquote: update Status column with date and brief outcome; include example format
