# Test Run: skill-repo-skill

```
repo: netresearch/skill-repo-skill
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
  Notes: Single skill at `skills/skill-repo/` with references/ (11 docs), scripts/ (4 scripts), templates/ (11 files including a nested `.github/workflows/` subdir). Repo has existing `package.json` with `"private": true`, version `0.0.0-source`, and dual license `(MIT AND CC-BY-SA-4.0)`.

- [x] **Step 2 — Bootstrap**

  Grade whether the test user was able to set up their environment using only the npm README for `create-skillet`.

  npm README: https://www.npmjs.com/package/create-skillet

  > **Guide note:** The test user does not know the name of the tool — discovering `create-skillet` is part of what Step 2 measures. If they found the npm page via direct search, that is a clean pass. If they arrived via the GitHub repo and used GitHub documentation to complete bootstrap, apply the soft-fail classification only for information they obtained exclusively from GitHub.

  Note any point where the test user consulted the GitHub README or required outside information to proceed.

  Outcome: 🟡 Soft fail — docs gap. Tool name was inferred from the pre-filled `create-skillet-version: 0.1.3` in the LOG header rather than discovered independently from the npm README.

- [x] **Step 3 — Run create-skillet**

  Grade how the test user navigated the wizard. Note the prompts shown, the defaults presented, and whether the defaults were sensible.

  Outcome: 🟠 Soft fail — UX issue. The wizard ran and produced a working result, but three silent transformations warrant a UX flag:

  1. **Version normalized silently**: `0.0.0-source` → `0.1.0`. The pre-release placeholder was discarded without warning. A user who intentionally used `0.0.0-source` as a convention would not notice.
  2. **License simplified silently**: `(MIT AND CC-BY-SA-4.0)` → `MIT`. The repo uses a dual license (MIT for code, CC-BY-SA-4.0 for content documentation). The wizard reduced this to a single SPDX identifier. The CC-BY-SA-4.0 coverage is lost in the packaged metadata.
  3. **`"private": true` retained**: The wizard did not prompt the user about this field, which will prevent `npm publish` from working. No warning was shown.

  Skill content path auto-detected correctly as `skills/skill-repo/`. No file-move prompt appeared.

- [x] **Step 4 — Verify output**

  Observe what the test user does to verify the output. Note what they look for and whether the tool's own output gave them sufficient guidance — without prompting them.

  Notes: Test user checked package.json fields (version, private, skillet.skillDir, bin) and inspected bin/cli.js for ISS-003. Noted all three silent transformations (version, license, private). Good verification depth.

- [x] **Step 5 — Install skill**

  Grade the install step. Note whether the test user found the install path from the available documentation alone.

  Available documentation for this step includes the npm README at https://www.npmjs.com/package/@skillet-cli/core

  Notes: ✅ Pass. `npx . install` succeeded. ISS-003 (hardcoded path) was present but the hardcoded `../skills/skill-repo/` path matched the actual skill location, so install completed without failure. Skill landed at `/root/.claude/skills/skill-repo/`.

- [x] **Step 6 — Verify skill placement**

  Confirm skill files landed in the correct relative path **inside the container**. This step verifies structural correctness — that the packaging and install mechanics worked — not that the skill is active in a real agent environment.

  | Environment | Expected skill install path |
  |---|---|
  | Claude Code | `~/.claude/skills/<skill-name>/` |
  | GitHub Copilot CLI | `~/.config/gh-copilot/skills/<skill-name>/` |
  | Custom agent | Defined by the agent's configuration |

  Actual path observed: `/root/.claude/skills/skill-repo/` — contents: SKILL.md, checkpoints.yaml, evals/, references/, scripts/, templates/
  Match: yes ✅ All companion files including templates/ (with nested `.github/workflows/` subdir) were included.

---

## Soft-Fail Log

| Step | Symbol | Notes |
|------|--------|-------|
| Step 2 | 🟡 | Tool name inferred from pre-filled LOG header |
| Step 3 | 🟠 | Silent: version `0.0.0-source`→`0.1.0`, license `(MIT AND CC-BY-SA-4.0)`→`MIT`, `"private": true` retained without warning |

---

## Issues Filed

None new. ISS-003 confirmed again (known) — see T3a run.

---

## UX Quality Observations

- **Silent license simplification** is the most notable finding. The repo uses a dual license to distinguish code (MIT) from documentation/content (CC-BY-SA-4.0). The wizard reduces this to `MIT` without warning. For repos with intentional dual licensing, this silently drops coverage metadata. Worth surfacing as a warning or prompt.
- **`"private": true` not cleared**: If a user runs `npm publish` after packaging, it will fail silently. A post-setup hint ("Note: package.json has `private: true` — remove it before publishing") would prevent confusion.
- **Pre-release version normalization** (`0.0.0-source` → `0.1.0`): The wizard appears to replace non-semver or placeholder versions with its default. This is sensible behaviour but should be surfaced in the confirmation summary so the user can see what changed.
- **Templates with nested subdirectories** (`templates/.github/workflows/`) installed correctly — the installer handles arbitrary nesting inside companion directories.
- **Install verb consistency**: T3a used "Roasted", T3b used "Fried". The verb appears to vary per package, which is a UX curiosity (charming but potentially surprising).
