## Context

The `test-manual/` harness supports manual E2E testing of `create-skillet` and `@skillet-cli/core` using Docker containers, tmux sessions, and two defined roles (Guide and Test User). Three runs conducted on 2026-06-06 identified six recurring problems:

- Missing Git in container setup (every run required off-task `apt-get install -y git`)
- Test user cloning the repo (environment setup masquerading as user task behavior)
- Role conflation when a coding agent plays both Guide and Test User (prior-run knowledge leaks into subsequent runs, softening failure grades)
- LOG template structure places format examples inside an unclosed HTML comment that extends into the append region
- Tier misclassification in the matrix was never caught because pre-session re-inspection was advisory, not mandatory
- `AGENT-SUPPLEMENT.md` documents `wait-for-text.sh` with a relative path that fails outside of `test-manual/`

The harness is a small set of shell scripts, Makefiles, and Markdown templates — no compiled code, no external services.

## Goals / Non-Goals

**Goals:**
- Eliminate all per-run off-task steps that every guide must perform manually
- Ensure the test user's LOG reflects only product behavior, not container setup steps
- Make the role separation between Guide and Test User structurally enforced for coding-agent sessions (not just documented)
- Fix two template defects that silently corrupted run 1's LOG entries and contributed to tier misclassification across all three runs

**Non-Goals:**
- Fully automating the session (the harness is intentionally manual; the guide still observes and grades)
- Changing the test protocol steps or failure taxonomy
- Addressing product-side issues found during runs (those are tracked as separate GitHub issues #32–37)

## Decisions

### 1. Add Git to `test-start` alongside Node

`test-start` already runs an apt-get block to install Node via the NodeSource script. Git is added to the same block. No new target needed; this is a one-line change.

_Alternative considered:_ Separate `make install-deps` target. Rejected — the whole point of `test-start` is a fully ready container. Requiring a second command creates the same class of problem we're fixing.

### 2. New `make prep-run` target for repo pre-cloning

A new `prep-run REPO_URL=<url>` Makefile target runs `docker exec` to clone the specified URL into `/repo/<slug>` inside the running container (where `<slug>` uses the same `org-repo` format as `init-run` — derived from the last two path components of the URL joined with `-`). The target creates `/repo` inside the container if it does not already exist before running the clone. The container must already be running (i.e., `test-start` must have been called first).

Guide workflow becomes:
```
make test-start
make init-run REPO=<org>-<repo>
make prep-run REPO_URL=https://github.com/<org>/<repo>
# both commands use the same org-repo slug; fill in TASK.md with /repo/<org>-<repo>, hand off to test user
```

The tmux session's working directory is left at the container shell's default (`/`); the guide hands the test user a starting path in TASK.md rather than `cd`-ing for them, preserving the test user's agency to navigate.

_Alternative considered:_ Extending `test-start` with an optional `REPO_URL` variable. Rejected — `test-start` is a container lifecycle command; baking repo content into it conflates environment setup with session prep and makes `test-start` non-reusable across runs on the same machine.

_Alternative considered:_ README-only documentation with no Makefile target. Rejected — the Makefile is already the single operational interface; a manual `docker exec git clone` step is exactly the kind of off-task noise we're eliminating.

### 3. Role separation for coding-agent sessions: sub-agent dispatch

For human sessions, role separation is structural (two people). For coding-agent sessions, the proposed approach is to dispatch the Test User role as an isolated sub-agent (e.g., via Claude Code's `Agent` tool) with only `TASK.md`, `LOG.md`, and `AGENT-SUPPLEMENT.md` in its initial context — no prior conversation history, no harness documentation, no knowledge of previous runs.

The Guide agent observes the sub-agent's tmux output and LOG, then grades independently in `TEST-RUN.md`.

This is a documentation and process change (AGENT-SUPPLEMENT.md and README), not a code change. The harness cannot enforce context isolation programmatically; it can only document the required pattern clearly.

_Alternative considered:_ Running separate Claude Code sessions for Guide and Test User. Equivalent effect but harder to coordinate in practice. Sub-agent dispatch is the natural primitive within a single session.

### 4. LOG template: close the HTML comment before the append region

The current template has a single `<!-- ... -->` comment block that contains the format examples. The closing `-->` appears at the end of the examples, but the append region begins inside the same block structure. In practice, the comment is never properly closed before the test user starts appending entries.

Fix: Place the format examples inside a fully self-contained `<!-- ... -->` comment that is explicitly closed before the line `<!-- Append entries below. -->`. The examples comment and the append marker are adjacent — no blank line between them — so there is no ambiguous insertion zone where a user might begin writing before reaching the marker. The append region is then outside any comment.

No new syntax — just restructuring the template so the HTML comment boundaries are unambiguous. AGENT-SUPPLEMENT.md will also note that log entries are plain text and must not be wrapped in `<!-- -->` comment syntax, since a coding agent reading both comment blocks could otherwise infer that entries follow the same comment pattern.

### 5. Pre-session re-inspection: mandatory step in README and TEST-RUN template

The README's "Before You Start" checklist currently says "Inspect the repo... and identify its tier." This is framed as a one-time classification that was done when the repo was added to the matrix. All three runs started with wrong tier entries.

Change: Step 3 of the checklist becomes "Re-inspect the repo and confirm the tier against the matrix entry." The wording makes clear this must happen before every run, not just when the repo is first catalogued. If the tier is wrong, the guide updates the matrix entry before proceeding.

The TEST-RUN template's Step 1 note is updated to explicitly prompt the guide to check their matrix entry and correct it if needed.

### 6. AGENT-SUPPLEMENT: replace relative path with explicit resolution note

The supplement currently shows `./scripts/wait-for-text.sh`. Replace this with the convention that agents should resolve the script path from a known reference point — specifically, from the `test-manual/` directory where the Makefile lives — and document the absolute-path pattern agents should use:

```bash
HARNESS_DIR="$(git rev-parse --show-toplevel)/test-manual"
"$HARNESS_DIR/scripts/wait-for-text.sh" -S "$SOCKET" -t skillet-test -p "pattern" -T 15
```

This works regardless of where the agent's working directory is at the time of the call.

### 7. Move run folders from `tmp/` (gitignored) to `runs/` (committed)

Run folders created by `init-run` currently land in `test-manual/tmp/`, which is gitignored. This means session logs, grading records, and issue files are lost after each run. The permanent artifact store for test sessions is valuable — it allows tracking coverage over time and reviewing past grading decisions.

Change: `init-run` creates run folders under `test-manual/runs/` instead of `test-manual/tmp/`. `runs/` is a tracked directory with a committed `.gitkeep`. The gitignore entry for `test-manual/tmp/*` remains, keeping `tmp/` available as a scratchpad for anything that should not be committed.

The session's cloned repo lands inside the Docker container at `/repo/<slug>` and is torn down with the container — it never touches the host filesystem, so there is nothing repo-clone-like to gitignore under `runs/`.

_Alternative considered:_ Selectively gitignore non-markdown files under `tmp/` (e.g., `!tmp/**/*.md`). Rejected — gitignore negation for nested directories is fragile, and the intent is straightforwardly "these .md records should be kept." A dedicated `runs/` directory makes the intent unambiguous.

## Risks / Trade-offs

**`prep-run` is a new required step** → Guides who skip it will have the test user clone manually again (same problem as before). Mitigation: README checklist makes it explicit; the TASK.md template notes "the repository has been pre-cloned for you at `/repo/<org>-<repo>`." Because `prep-run` and `init-run` both use the same `org-repo` slug derived from the URL, the path in TASK.md will always match the actual clone location.

**Sub-agent role separation is not enforced by tooling** → A guide agent that has prior run context can still play both roles with that knowledge intact. Mitigation: The README documents this clearly as a hard requirement, not a suggestion. Guides who conflate roles should note it in the run metadata.

**Tier corrections depend on guide judgment** → Making re-inspection mandatory does not guarantee correct classification; it only ensures it happens. Mitigation: The tier reference table in the README is the authoritative definition; guides who are uncertain should err toward the higher tier.

## Open Questions

None. All six changes are small and self-contained; no external dependencies or stakeholder sign-off required.
