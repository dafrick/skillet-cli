# Test Run: agent-rules-skill

```
repo: netresearch/agent-rules-skill
tier: T3
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

  Confirm the tier you identified during pre-session setup. Update if your assessment changes after inspecting the repo or the output of `create-skillet`.

  Tier: T3
  Notes: Single skill at `skills/agent-rules/` with deeply nested companion files: assets/ (20+ .md files), references/ (7 docs + 10 examples with multiple files each), scripts/ (22 shell scripts + lib/ subdir), evals/, checkpoints.yaml, AGENTS.md, CLAUDE.md. Repo also has root-level scripts/, docs/, evals/, assets/ directories.

- [x] **Step 2 — Bootstrap**

  Grade whether the test user was able to set up their environment using only the npm README for `create-skillet`.

  npm README: https://www.npmjs.com/package/create-skillet

  > **Guide note:** The test user does not know the name of the tool — discovering `create-skillet` is part of what Step 2 measures. If they found the npm page via direct search, that is a clean pass. If they arrived via the GitHub repo and used GitHub documentation to complete bootstrap, apply the soft-fail classification only for information they obtained exclusively from GitHub.

  Note any point where the test user consulted the GitHub README or required outside information to proceed.

  Outcome: 🟡 Soft fail — docs gap. Test user ran `npx create-skillet@0.1.3` directly without showing discovery steps. The pre-filled `create-skillet-version: 0.1.3` in the LOG header likely provided the tool name, which is an artifact of the guide setup. A real user starting from scratch would need to find the tool independently.

- [x] **Step 3 — Run create-skillet**

  Grade how the test user navigated the wizard. Note the prompts shown, the defaults presented, and whether the defaults were sensible.

  Outcome: ✅ Pass. The wizard auto-detected the existing `package.json` and skill at `skills/agent-rules/SKILL.md`. All defaults were sensible and populated correctly from the existing package metadata (name: `@netresearch/agent-rules-skill`, author: `Netresearch DTT GmbH (https://www.netresearch.de/)`, repo URL). Skill content path defaulted to `skills/agent-rules/` correctly. No file-move prompt appeared (skill was already in a dedicated subdirectory). Wizard completed and wrote `skillet.skillDir: "skills/agent-rules/"` to package.json.

- [x] **Step 4 — Verify output**

  Observe what the test user does to verify the output. Note what they look for and whether the tool's own output gave them sufficient guidance — without prompting them.

  Notes: Test user inspected package.json after the wizard (checking `skillet.skillDir` and `bin` entry) and then examined `bin/cli.js` to verify skill path handling. Found ISS-003 (hardcoded path) during verification. Good depth of inspection for a T3 repo.

- [x] **Step 5 — Install skill**

  Grade the install step. Note whether the test user found the install path from the available documentation alone.

  Available documentation for this step includes the npm README at https://www.npmjs.com/package/@skillet-cli/core

  Notes: ✅ Pass. Ran `npx . install`, selected user scope and Claude Code target. Install completed in 0.1s. Despite ISS-003 (bin/cli.js hardcodes skillDir), the hardcoded path `../skills/agent-rules/` happened to be correct for this repo structure, so install succeeded without needing the ISS-003 workaround.

- [x] **Step 6 — Verify skill placement**

  Confirm skill files landed in the correct relative path **inside the container**. This step verifies structural correctness — that the packaging and install mechanics worked — not that the skill is active in a real agent environment.

  | Environment | Expected skill install path |
  |---|---|
  | Claude Code | `~/.claude/skills/<skill-name>/` |
  | GitHub Copilot CLI | `~/.config/gh-copilot/skills/<skill-name>/` |
  | Custom agent | Defined by the agent's configuration |

  Actual path observed: `/root/.claude/skills/agent-rules/` — contents: SKILL.md, AGENTS.md, CLAUDE.md, checkpoints.yaml, assets/, evals/, references/, scripts/
  Match: yes ✅ All expected companion files included.

---

## Soft-Fail Log
<!-- Summarize steps that didn't pass cleanly. Per-step Outcome fields above hold the full notes; this table is a quick-scan overview. -->

| Step | Symbol | Notes |
|------|--------|-------|
| Step 2 | 🟡 | Used tool name from pre-filled LOG header rather than independent discovery |
| Step 5 | 🟠 | ISS-003 is latent — install succeeds by coincidence (hardcoded path matches); would fail if skillDir changed post-packaging |

---

## Issues Filed

- [ISS-003](./issues/ISS-003.md) — bin/cli.js hardcodes skillDir instead of reading from pkg.skillet.skillDir (known bug, confirmed again; did not block install here)

---

## UX Quality Observations

- **Auto-detection of skill path** worked well for this repo. The wizard correctly identified `skills/agent-rules/` as the skill directory without any user input.
- **Defaults for pre-existing package.json** are excellent: name, author, license, and repo URL were all pre-populated correctly from the existing metadata.
- **No file-move prompt** for this repo structure — the skill was already organized correctly. This is the happy path for T3 repos that already follow the expected directory layout.
- **ISS-003 latent risk**: The generated `bin/cli.js` hardcodes the skill path at packaging time. This is safe when the directory structure doesn't change, but fragile: any post-packaging reorganization (or a future ISS-002 scenario) would cause `npx . install` to silently install from the wrong path.
- **Deep companion file preservation**: All 22+ scripts, references, assets, evals, and checkpoints.yaml were correctly installed alongside SKILL.md. The installer handles deeply nested companion files correctly.
