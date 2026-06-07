# Test Run: netresearch/agent-rules-skill

```
repo: netresearch/agent-rules-skill
tier: T3
env: Claude Code
create-skillet-version: 0.1.1
date: 2026-06-07
tester: Claude Sonnet 4.6 (sub-agent)
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
  Notes: Pre-session inspection confirmed single skill (`skills/agent-rules/`) with deeply nested `scripts/`, `references/`, `assets/`, and `evals/` subdirectories. Matrix entry corrected from T1 before session start. Assessment unchanged after session.

- [x] **Step 2 — Bootstrap**

  Grade whether the test user was able to set up their environment using only the npm README for `create-skillet`.

  npm README: https://www.npmjs.com/package/create-skillet

  > **Guide note:** The test user does not know the name of the tool — discovering `create-skillet` is part of what Step 2 measures. If they found the npm page via direct search, that is a clean pass. If they arrived via the GitHub repo and used GitHub documentation to complete bootstrap, apply the soft-fail classification only for information they obtained exclusively from GitHub.

  Note any point where the test user consulted the GitHub README or required outside information to proceed.

  Outcome: **Not gradeable — harness design issue.** The guide pre-filled `create-skillet-version: 0.1.1` in LOG.md before handing it to the test user. The test user's first logged action was `npx create-skillet --help` with no prior discovery step, indicating they read the tool name directly from the LOG.md frontmatter. Discovery of `create-skillet` cannot be assessed as a clean pass or fail under these conditions. See UX Quality Observations for a harness recommendation.

- [x] **Step 3 — Run create-skillet**

  Grade how the test user navigated the wizard. Note the prompts shown, the defaults presented, and whether the defaults were sensible.

  Outcome: 🔶 Mid fail — functional issue. The tool crashed immediately on first run (`ENOENT: fonts/ANSI Shadow.flf`) — the figlet fonts directory is not included in the published npm package (→ ISS-001). Test user diagnosed the issue and applied a manual workaround (copying font files from a locally installed `figlet` package). After workaround, wizard launched and ran to completion. Prompts shown: package name, version, description, author, repository URL, license, skill content path. Defaults were sensible except version defaulted to `1.0.0` (reasonable). Skill content path prompt defaulted to `.` — test user overrode to `skills/agent-rules/`. Wizard completion message: "Done in 142.3s — Your skill package is ready."

- [x] **Step 4 — Verify output**

  Observe what the test user does to verify the output. Note what they look for and whether the tool's own output gave them sufficient guidance — without prompting them.

  Notes: ✅ Test user inspected the output directory and confirmed package.json was updated with `@skillet-cli/core` and that the skill content path was configured. Wizard output was sufficient to orient the test user for the next step.

- [x] **Step 5 — Install skill**

  Grade the install step. Note whether the test user found the install path from the available documentation alone.

  Available documentation for this step includes the npm README at https://www.npmjs.com/package/@skillet-cli/core

  Notes: ✅ Test user ran `npx . install` — derived directly from the wizard's completion output ("Your skill package is ready"), not from consulting external documentation. Target selection showed "not detected" for both Claude Code and GitHub Copilot (expected in a bare container). Test user navigated the checkboxes using key sequences (selected all with `a`, inverted with `i`, then re-selected Claude Code with `space`). Warning appeared: `[skillet] Could not resolve dependency @skillet-cli/core from ...` — install completed despite warning.

- [x] **Step 6 — Verify skill placement**

  Confirm skill files landed in the correct relative path **inside the container**. This step verifies structural correctness — that the packaging and install mechanics worked — not that the skill is active in a real agent environment.

  | Environment | Expected skill install path |
  |---|---|
  | Claude Code | `~/.claude/skills/<skill-name>/` |
  | GitHub Copilot CLI | `~/.config/gh-copilot/skills/<skill-name>/` |
  | Custom agent | Defined by the agent's configuration |

  Actual path observed: `/root/.claude/skills/agent-rules/` — contains `SKILL.md`, `AGENTS.md`, `CLAUDE.md` (symlink), `checkpoints.yaml`, `assets/`, `evals/`, `references/`, `scripts/`, `.skill-manifest.json`
  Match: yes

---

## Soft-Fail Log
<!-- Summarize steps that didn't pass cleanly. Per-step Outcome fields above hold the full notes; this table is a quick-scan overview. -->

| Step | Symbol | Notes |
|------|--------|-------|
| 2 | — | Not gradeable — harness leaked tool name via LOG.md frontmatter |
| 3 | 🔶 | Crashed on startup (missing fonts/); workaround allowed completion |

---

## Issues Filed

- [ISS-001](./issues/ISS-001.md) — create-skillet crashes on startup: fonts directory missing from published npm package

---

## UX Quality Observations

- **`npx . install` dependency warning:** The install step printed `[skillet] Could not resolve dependency @skillet-cli/core from ...` but completed successfully. No explanation given to the user. A new user would likely be confused about whether the install succeeded.

- **Target detection showed "not detected" in container:** Both Claude Code and GitHub Copilot showed as not detected. This is expected in a bare container, but the UX didn't explain why — a real user might wonder if something is wrong with their agent installation.

- **Checkbox navigation not self-evident:** The test user needed to use `a` (select all), `i` (invert), `space` (select one) to reach a single-item selection. Standard single-select UX for a common case (one target) would be clearer.

- **Skill content path default is `.`:** When the test user ran the wizard from the repo root, the skill content path defaulted to `.` — the correct answer was `skills/agent-rules/`. For a T3 repo with skills in a subdirectory, this default is wrong and requires the user to know the directory layout. The wizard could inspect the repo for `SKILL.md` files and suggest the correct path.

- **Harness design issue — LOG.md frontmatter reveals tool name:** The guide pre-fills `create-skillet-version:` in LOG.md before handing it to the test user. A coding agent reading the LOG.md at session start will see the tool name before performing any discovery. Step 2 (Bootstrap) cannot be graded for discovery in coding-agent sessions unless the version field is removed from the pre-filled frontmatter and filled in by the guide only after the session, or the test user's LOG.md copy is prepared without it.
