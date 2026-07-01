## Context

The `test-manual/` harness runs integration tests of the full skill-authoring workflow using Docker containers and a fresh agent as the test user. `TEST-MATRIX.md` tracks which target repos have been tested and at what tier. The `runs/` directory is currently empty — all prior runs were invalidated and removed during harness improvements. The fix that corrects the Step 2 contamination (moving `create-skillet-version:` out of the pre-session frontmatter) landed in commit `82c73d7` but has never been exercised.

## Goals / Non-Goals

**Goals:**
- Produce one valid Step 2 data point for T1 (`Hao0321/claude-skill-code-cleanup`) using the corrected harness
- Document the Step 2 outcome honestly: discovery or agent-recall contamination
- Update `TEST-MATRIX.md` with the T1 result

**Non-Goals:**
- Modifying any harness source code, templates, or scripts
- Running additional tiers (T2–T5) — those belong in separate issues
- Changing grading methodology
- Reaching a conclusion about whether agent testers can ever provide clean Step 2 signal

## Decisions

**Use a fresh sub-agent as the test user, not a human.** The issue explicitly allows "an agent restricted from using training-data tool names." A fresh sub-agent given only the three harness files (`TASK.md`, `LOG.md`, `AGENT-SUPPLEMENT.md`) and no other context is the best practical implementation of this constraint. If the agent recalls the tool name anyway, that outcome is recorded as "agent-recall contamination" and is itself useful data — it establishes the ceiling of agent-based Step 2 testing. A human tester is not required to close this issue.

**Use T1 (`Hao0321/claude-skill-code-cleanup`), not a new repo.** The simplest tier provides the cleanest isolation of the Step 2 question. T1 has a prior run baseline for steps 3–6, so any regressions are visible. New repos add uncontrolled variables.

**Run the full protocol (all 6 steps), not just Step 2.** The harness is designed as an end-to-end session; stopping after Step 2 would leave the Docker container running and the run folder incomplete. Steps 3–6 produce useful data even if Step 2 is contaminated.

## Risks / Trade-offs

- **Agent recall contaminates Step 2 again** → Record the outcome honestly ("agent-recall suspected; tester typed tool name without prior search"); the issue is closed because the experiment was run correctly — the contamination is now documented rather than undetected.
- **Docker unavailable at run time** → Docker 29.4.2 is confirmed present; risk is low.
- **Harness produces an unexpected error** → File a new GitHub issue for the harness failure; close this issue if Step 2 was reached and graded before the failure.
- **`AGENT-SUPPLEMENT.md` contains tool name in tmux example** → `test-manual/AGENT-SUPPLEMENT.md` line 24 uses `"npx create-skillet"` as the example argument for `send-keys -l`. This is a syntax illustration, not a directive, but the tester could read it before any discovery step. Mitigation: the guide creates a run-local redacted copy (stored in the run folder) with that argument replaced by `"<your-command>"` and hands the redacted copy to the tester. The original source file is not modified. This preserves the no-template-changes constraint while eliminating the pre-exposure.

**Criterion #2 of the issue ("tester's starting point is documented as the npm README URL") is satisfied by the harness's design, not superseded by it.** The issue's acceptance criterion states: "the tester's starting point is documented as the npm README URL (`https://www.npmjs.com/package/create-skillet`)." This is satisfied in two ways:
- If the tester finds `https://www.npmjs.com/package/create-skillet` through their own search, `LOG.md` records it as the first documentation consulted — the npm README URL is then the documented starting point.
- If the tester recalls the tool name directly (agent recall), `LOG.md` records that no npm README was consulted before the first command, and the grade is "not gradeable — agent recall suspected."

The harness does NOT pre-supply the npm README URL in `TASK.md`. This is a deliberately stricter test: it lets the tester discover the URL on their own rather than being handed it. If the tester arrives at the npm README through search, the criterion is satisfied with a cleaner signal than pre-seeding would provide. The run therefore either meets criterion #2 (tester found the npm URL and it's documented) or honestly records why it cannot be graded (agent recall). Neither outcome causes the issue's acceptance criteria to fail.

## Open Questions

None. The approach is fully determined by the issue body and discovery findings.
