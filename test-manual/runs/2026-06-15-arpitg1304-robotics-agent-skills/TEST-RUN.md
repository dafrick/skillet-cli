# Test Run: robotics-agent-skills

```
repo: arpitg1304/robotics-agent-skills
tier: T4
env: Claude Code
create-skillet-version: 0.1.3
date: 2026-06-15
tester: claude-sonnet-4-6
```

---

## Failure Taxonomy Key

| Symbol | Meaning |
|--------|---------|
| ✅ Pass | Worked correctly using only available documentation; UX clear and defaults sensible |
| 🟡 Soft fail — docs gap | Worked but required consulting the GitHub README beyond the npm README |
| 🟠 Soft fail — UX issue | Worked functionally but UX was confusing, defaults wrong, preview inaccurate, or post-install guidance unclear |
| 🔶 Mid fail — functional issue | Something was wrong functionally (beyond UX or docs), but a workaround allowed the step to complete |
| 🔴 Hard fail | Threw an error, produced wrong output, or could not be completed even with workarounds |
| 🔵 N/A | Test step not applicable to this tier or this repo's structure |

---

> **Issue filing:** File `ISS-NNN.md` in `issues/` as issues arise during the session — do not wait until the end. Reference each in `LOG.md` (e.g., `→ ISS-001`).

---

## Happy-Path Protocol

- [x] **Step 1 — Confirm tier**

  Tier: T4
  Notes: 10 SKILL.md files at `skills/<topic>/SKILL.md`, each with no companion files. No root `package.json`. Root has `install.sh` and `evals/` only. First multi-skill repo in this test run.

- [x] **Step 2 — Bootstrap**

  Outcome: 🟡 Soft fail — docs gap. Tool name inferred from pre-filled `create-skillet-version: 0.1.3` header.

- [x] **Step 3 — Run create-skillet**

  Outcome: 🔴 Hard fail — two separate issues:

  **ISS-001 (first run crash):** Left Description prompt blank → `npm pkg set description=` rejected by npm with `EUSAGE: npm pkg set expects a key=value pair of args`. Wizard exited "Setup failed", leaving a stale `package.json` on disk. Removed stale file; re-ran with non-empty description — second run succeeded. This is the same class of bug as the empty-author crash seen in T1 (prior runs' ISS-001), applied to the description field.

  **ISS-002 (core T4 failure):** With 10 SKILL.md files under `skills/`, the wizard presented a **single-select** "Select skill content path" list — the user must pick exactly one skill. No multi-skill mode was offered. The test user selected `skills/docker-ros2-development/` (first in list). The other 9 skills were silently ignored. The `skillsParent` concept is absent from v0.1.3. A T4 user's core goal — packaging all their skills together — cannot be achieved.

  Prompt sequence (second run): Proceed → name → version → description → author → repo URL → license → **single-select skill path** → confirm.

- [x] **Step 4 — Verify output**

  Notes: Test user checked `package.json` (only 1 skill in `skillet.skillDir`), `bin/cli.js` (ISS-003 hardcoded path). Noted stale file from failed first run. Thorough.

- [x] **Step 5 — Install skill**

  Notes: 🔶 Mid fail — functional issue. `npx . install` ran and completed for the one packaged skill (`docker-ros2-development`). Install verb: "Baked". Installed to `/root/.claude/skills/docker-ros2-development/`. However, 9 of 10 skills were not packaged and therefore not installed. The step "completed" but delivered only 10% of the intended outcome.

- [x] **Step 6 — Verify skill placement**

  Actual path observed: `/root/.claude/skills/docker-ros2-development/` — contains only `SKILL.md`.
  Match: **partial** — 1 of 10 skills installed at correct path. 9 skills absent.

---

## Soft-Fail Log

| Step | Symbol | Notes |
|------|--------|-------|
| Step 2 | 🟡 | Tool name from pre-filled header |
| Step 3 | 🔴 | ISS-001: empty description crash (workaround: re-run with non-empty description). ISS-002: no multi-skill mode; only 1 of 10 skills packaged |
| Step 5 | 🔶 | Install completed but only 1/10 skills installed |
| Step 6 | 🔴 | Only 1 skill at correct path; 9 silently missing |

---

## Issues Filed

- [ISS-001](./issues/ISS-001.md) — Empty description field crashes wizard at Seasoning step (same class as prior ISS-001/empty-author)
- [ISS-002](./issues/ISS-002.md) — No multi-skill mode: wizard single-selects one skill from 10; others silently ignored
- [ISS-003](./issues/ISS-003.md) — bin/cli.js hardcodes skill path (known, confirmed again)

---

## UX Quality Observations

- **Silent omission of 9 skills** is the most severe UX failure in any run so far. A user with 10 skills who runs `create-skillet` sees no warning that only 1 will be packaged. The natural expectation ("package my skills") is silently unmet.
- **Single-select prompt is confusing for multi-skill repos**: the prompt label "Select skill content path" sounds like a single-skill concept. A user who discovers this is a T4 repo has no way to select multiple skills — neither checkbox nor multi-skill mode appears.
- **Empty description crash**: the `npm pkg set` family of failures (empty author, empty description) keeps recurring across runs. A guard in the wizard before calling `npm pkg set` would fix the entire class.
- **No git user detection**: `arpitg1304/robotics-agent-skills` has no existing package.json; the wizard could not detect git user, leaving Author with no default. On a fresh repo, the user must always type something — this should at least say "(required)" in the prompt.
- **Stale package.json on failure**: after the wizard crashes, it leaves a `npm init -y`-created `package.json` on disk. The next run picks this up and may behave differently than a fresh run. Cleanup-on-failure would prevent confusion.
