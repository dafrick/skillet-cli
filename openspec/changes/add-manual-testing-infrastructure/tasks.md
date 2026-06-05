## 1. Repo Setup

- [ ] 1.1 Create `test-manual/` directory at repo root
- [ ] 1.2 Create `test-manual/tmp/.gitkeep`
- [ ] 1.3 Add `test-manual/tmp/*` to root `.gitignore` (contents pattern, not directory pattern — keeps `.gitkeep` committable)
- [ ] 1.4 Create `test-manual/scripts/` and `test-manual/templates/` directories

## 2. wait-for-text.sh

- [ ] 2.1 Create `test-manual/scripts/wait-for-text.sh` adapted from mitsuhiko/agent-stuff: accepts `-S` (socket), `-t` (target), `-p` (pattern), `-T` (timeout, default 15), `-i` (interval, default 0.5), `-F` (fixed string); polls `tmux capture-pane`; exits 0 on match, 1 on timeout with last output to stderr
- [ ] 2.2 Make `wait-for-text.sh` executable (`chmod +x`)

## 3. Makefile

- [ ] 3.1 Create `test-manual/Makefile` with `CONTAINER`, `SOCKET`, `SESSION`, and `IMAGE` variables (defaults: `skillet-test-container`, `${TMPDIR:-/tmp}/claude-tmux-sockets/skillet.sock`, `skillet-test`, `ubuntu:24.04`)
- [ ] 3.2 Add `test-start` target: `mkdir -p` socket dir, `docker run -d --name $(CONTAINER) $(IMAGE) sleep infinity`, `tmux -S "$(SOCKET)" new -d -s $(SESSION)`, send `docker exec -it $(CONTAINER) bash` followed by `Enter` to the session, print the monitor command and the send-keys helper syntax
- [ ] 3.3 Add `test-teardown` target: kill tmux session (ignore error if not found), `docker rm -f $(CONTAINER)` (ignore error if not found)
- [ ] 3.4 Add both targets to `.PHONY`

## 4. Templates

- [ ] 4.1 Create `test-manual/templates/ISSUE.md.template` with fields: title, description (what happened), reproduction steps, how encountered, why it is bad (user impact), severity (critical/high/medium/low), workaround
- [ ] 4.2a Create `test-manual/templates/TEST-RUN.md.template` skeleton: session metadata block (repo URL, tier, env, date, tester), seven-step protocol with checkboxes where Step 1 is "Identify the tier" with the five tier definitions table inline, soft-fail log section
- [ ] 4.2b Complete `TEST-RUN.md.template`: issues list section (ISS-NNN links with one-line summaries), UX quality observations section, failure taxonomy key (✅ pass, 🟡 soft fail — docs gap, 🟠 soft fail — UX issue, 🔴 hard fail)
- [ ] 4.3 Create `test-manual/templates/LOG.md.template`: header with repo/date/tester fields, brief instruction that entries are append-only (never edit prior entries), and a prompt showing the HH:MM entry format with an example ISS-NNN reference

## 5. TEST-MATRIX.md

- [ ] 5.1 Create `test-manual/TEST-MATRIX.md` with "Candidate Repos" table (Tier, Repo, Complexity notes, Status) seeded with five repos spanning tiers 1–5: `netresearch/agent-rules-skill` (T1), `netresearch/skill-repo-skill` (T2), `harness/harness-skills` (T3), `addyosmani/agent-skills` (T4), `obra/superpowers` (T5)
- [ ] 5.2 Add "Test Run Log" table (Date, Repo, Tier, Env, Outcome, Run folder) with an empty placeholder row

## 6. README.md

- [ ] 6.1 Create `test-manual/README.md` — Overview section (what this is, user persona)
- [ ] 6.2 Add Prerequisites section (Docker, tmux; note: no Node required on host)
- [ ] 6.3 Add "Running a test" section: `make test-start`, then `make test-teardown`; document that the run folder lives at `test-manual/tmp/YYYY-MM-DD-<repo-slug>/` and contains `LOG.md`, `TEST-RUN.md`, and `issues/`
- [ ] 6.4 Add seven-step test protocol section with failure taxonomy; include a step for filling in the `env:` field before starting — note that environment choice is up to the tester, with a reminder to vary environments across runs for coverage
- [ ] 6.5 Add Tmux Reference section for coding agents: private socket setup, `tmux send-keys` with `-l` flag for literal sends, `tmux capture-pane -p -J` for reading output, `wait-for-text.sh` usage, `@inquirer/prompts` key sequences (arrow keys, space, Enter, Ctrl+U, Ctrl+C), cleanup
- [ ] 6.6 Add "Keeping the log" section: LOG.md is append-only (never rewrite), HH:MM timestamp format, reference ISS-NNN when filing an issue, distinction from TEST-RUN.md (log = narrative trace, test run = structured checklist)
- [ ] 6.7 Add "Documenting issues" section: how to name files (ISS-NNN), where they live (`tmp/<run>/issues/`), how to reference from LOG.md

## 7. Verification

- [ ] 7.1 Run `make test-start` and confirm container is running and tmux session exists with a bash prompt inside the container
- [ ] 7.2 Send a command via `tmux -S "$SOCKET" send-keys` and confirm it runs inside the container
- [ ] 7.3 Run `make test-teardown` and confirm container and session are gone
- [ ] 7.4 Confirm `git status` shows no untracked files under `test-manual/tmp/` after placing a test file there; confirm `git ls-files test-manual/tmp/.gitkeep` lists the file
- [ ] 7.5 Run `wait-for-text.sh` against a live tmux pane that contains the target pattern and confirm exit 0; run it against a pane without the pattern with `-T 3` and confirm exit 1 with pane content printed to stderr
