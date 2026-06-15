# Test Run: agent-rules-skill

```
repo: netresearch/agent-rules-skill
tier: T3
env: Claude Code
create-skillet-version: 0.2.1
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

  Confirm the tier you identified during pre-session setup. Update if your assessment changes after inspecting the repo or the output of `create-skillet`.

  Tier: T3
  Notes: Single SKILL.md at skills/agent-rules/SKILL.md, with deeply nested companion directories: assets/ (21 scoped markdown files + example-workflows/), references/ (6 docs + examples/ subdir with 3 full project trees), scripts/ (22+ shell scripts + lib/ subdir), evals/, checkpoints.yaml, AGENTS.md, CLAUDE.md. Repo has an existing package.json with name, description, author, and repository already set. Confirmed T3.

- [x] **Step 2 — Bootstrap**

  Grade whether the test user was able to set up their environment using only the npm README for `create-skillet`.

  npm README: https://www.npmjs.com/package/create-skillet

  > **Guide note:** The test user does not know the name of the tool — discovering `create-skillet` is part of what Step 2 measures. If they found the npm page via direct search, that is a clean pass. If they arrived via the GitHub repo and used GitHub documentation to complete bootstrap, apply the soft-fail classification only for information they obtained exclusively from GitHub.

  Note any point where the test user consulted the GitHub README or required outside information to proceed.

  Outcome: 🟡 Soft fail — docs gap. Same structural issue as T1 and T2: the `create-skillet-version: 0.2.1` pre-filled in the LOG header revealed the tool name before the test user could discover it independently. The test user ran `npx create-skillet@0.2.1` directly without searching.

- [x] **Step 3 — Run create-skillet**

  Grade how the test user navigated the wizard. Note the prompts shown, the defaults presented, and whether the defaults were sensible.

  Outcome: ✅ Pass. Wizard ran cleanly in a single pass. Because the repo has an existing package.json with name, description, author, and repository URL already set, all defaults were pre-populated and sensible. The skill content path was correctly auto-detected as `skills/agent-rules/`. The test user accepted all defaults. No empty-field crash (ISS-001 avoidance: non-empty author and description already in package.json). Package contents preview showed the full nested structure: AGENTS.md, CLAUDE.md, SKILL.md, assets, checkpoints.yaml, evals, references, scripts.

- [x] **Step 4 — Verify output**

  Observe what the test user does to verify the output. Note what they look for and whether the tool's own output gave them sufficient guidance — without prompting them.

  Notes: ✅ Pass. The wizard's own package contents preview displayed the skill directory contents clearly. Test user inspected the preview output (showed all top-level items in the skill dir) and confirmed structure looked correct. No explicit file-system verification with `find` was needed because the preview was sufficient. "Done in 150.7s — Your skill package is ready" was shown.

- [x] **Step 5 — Install skill**

  Grade the install step. Note whether the test user found the install path from the available documentation alone.

  Available documentation for this step includes the npm README at https://www.npmjs.com/package/@skillet-cli/core

  Notes: ✅ Pass. `npx . install` launched successfully from the wizard's own next-steps guidance. Selected "user" scope (default, recommended) and "Claude Code (not detected)" as target. Install completed: "✓ Baked claude /root/.claude/skills/agent-rules — 1 target installed · 0.1s".

- [x] **Step 6 — Verify skill placement**

  Confirm skill files landed in the correct relative path **inside the container**. This step verifies structural correctness — that the packaging and install mechanics worked — not that the skill is active in a real agent environment.

  | Environment | Expected skill install path |
  |---|---|
  | Claude Code | `~/.claude/skills/<skill-name>/` |
  | GitHub Copilot CLI | `~/.config/gh-copilot/skills/<skill-name>/` |
  | Custom agent | Defined by the agent's configuration |

  Actual path observed: `/root/.claude/skills/agent-rules/` — contents: `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, `assets/`, `checkpoints.yaml`, `evals/`, `references/`, `scripts/`, `.skill-manifest.json`
  Match: yes ✅

---

## Soft-Fail Log
<!-- Summarize steps that didn't pass cleanly. Per-step Outcome fields above hold the full notes; this table is a quick-scan overview. -->

| Step | Symbol | Notes |
|------|--------|-------|
| Step 2 | 🟡 | Tool name inferred from pre-filled `create-skillet-version` in LOG header |

---

## Issues Filed

None.

---

## UX Quality Observations

- **T3 happy path was clean.** Repos with existing package.json dramatically smooth the wizard experience — all metadata fields were pre-populated, leaving only skill content path to confirm.
- **Skill content path auto-detected correctly.** For this repo with SKILL.md nested under `skills/agent-rules/`, the wizard correctly proposed `skills/agent-rules/` as the default skill content path.
- **No file-selection prompt appeared.** Unlike T2 (where companion files had to be manually selected), T3 with `skillDir` already pointing into a subdirectory did not trigger an extra file-selection step — the entire `skills/agent-rules/` directory was included automatically.
- **Deep nesting preserved.** All nested subdirectories (assets/scoped/, references/examples/, scripts/lib/) were installed intact at `/root/.claude/skills/agent-rules/`.
- **"Claude Code (not detected)" is consistently shown** in the container environment. This is expected (Claude Code is not installed in the container) and does not affect install success.
- **Skill name derived from skillDir.** Install path was `/root/.claude/skills/agent-rules/`, derived from the `skills/agent-rules/` skillDir path — not from the package name `@netresearch/agent-rules-skill`. Consistent with prior runs.
