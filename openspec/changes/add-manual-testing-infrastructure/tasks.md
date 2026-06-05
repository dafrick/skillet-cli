## 1. Repo Setup

- [ ] 1.1 Create `test-manual/` directory at repo root
- [ ] 1.2 Create `test-manual/tmp/.gitkeep`
- [ ] 1.3 Add `test-manual/tmp/` to root `.gitignore`
- [ ] 1.4 Create `test-manual/scripts/` and `test-manual/templates/` directories

## 2. wait-for-text.sh

- [ ] 2.1 Create `test-manual/scripts/wait-for-text.sh` adapted from mitsuhiko/agent-stuff: accepts `-S` (socket), `-t` (target), `-p` (pattern), `-T` (timeout, default 15), `-i` (interval, default 0.5), `-F` (fixed string); polls `tmux capture-pane`; exits 0 on match, 1 on timeout with last output to stderr
- [ ] 2.2 Make `wait-for-text.sh` executable (`chmod +x`)

## 3. Makefile

- [ ] 3.1 Create `test-manual/Makefile` with `CONTAINER`, `SOCKET`, `SESSION`, and `IMAGE` variables (defaults: `skillet-test-container`, `${TMPDIR:-/tmp}/claude-tmux-sockets/skillet.sock`, `skillet-test`, `ubuntu:24.04`)
- [ ] 3.2 Add `test-start` target: `mkdir -p` socket dir, `docker run -d --name $(CONTAINER) $(IMAGE) sleep infinity`, `tmux -S "$(SOCKET)" new -d -s $(SESSION)`, send `docker exec -it $(CONTAINER) bash` to the session, print the monitor command and the send-keys helper syntax
- [ ] 3.3 Add `test-teardown` target: kill tmux session (ignore error if not found), `docker rm -f $(CONTAINER)` (ignore error if not found)
- [ ] 3.4 Add both targets to `.PHONY`

## 4. Templates

- [ ] 4.1 Create `test-manual/templates/ISSUE.md.template` with fields: title, description (what happened), reproduction steps, how encountered, why it is bad, severity (critical/high/medium/low), workaround
- [ ] 4.2 Create `test-manual/templates/TEST-RUN.md.template` with: session metadata block (repo, tier, env, date, tester), seven-step protocol with checkboxes (Step 1: identify tier with tier definitions table), soft-fail log section, issues list section (ISS-NNN links), UX quality observations section

## 5. TEST-MATRIX.md

- [ ] 5.1 Create `test-manual/TEST-MATRIX.md` with "Candidate Repos" table (Tier, Repo, Complexity notes, Status) seeded with five repos spanning tiers 1–5: `netresearch/agent-rules-skill` (T1), `netresearch/skill-repo-skill` (T2), `harness/harness-skills` (T3), `addyosmani/agent-skills` (T4), `obra/superpowers` (T5)
- [ ] 5.2 Add "Test Run Log" table (Date, Repo, Tier, Env, Outcome, Run folder) with an empty placeholder row

## 6. README.md

- [ ] 6.1 Create `test-manual/README.md` — Overview section (what this is, user persona)
- [ ] 6.2 Add Prerequisites section (Docker, tmux; note: no Node required on host)
- [ ] 6.3 Add "Running a test" section: `make test-start`, then `make test-teardown`; note that `test-manual/tmp/<run>/` holds the session LOG.md and `issues/`
- [ ] 6.4 Add seven-step test protocol section with failure taxonomy (pass ✅, soft fail — docs gap 🟡, soft fail — UX issue 🟠, hard fail 🔴)
- [ ] 6.5 Add Tmux Reference section for coding agents: private socket setup, `tmux send-keys` with `-l` flag for literal sends, `tmux capture-pane -p -J` for reading output, `wait-for-text.sh` usage, `@inquirer/prompts` key sequences (arrow keys, space, Enter, Ctrl+U, Ctrl+C), cleanup
- [ ] 6.6 Add "Documenting issues" section: how to name files (ISS-NNN), where they live, how to reference from LOG.md

## 7. Verification

- [ ] 7.1 Run `make test-start` and confirm container is running and tmux session exists with a bash prompt inside the container
- [ ] 7.2 Send a command via `tmux -S "$SOCKET" send-keys` and confirm it runs inside the container
- [ ] 7.3 Run `make test-teardown` and confirm container and session are gone
- [ ] 7.4 Confirm `git status` shows no untracked files under `test-manual/tmp/` after placing a test file there
