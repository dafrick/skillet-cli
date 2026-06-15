# Test Run: robotics-agent-skills

```
repo: arpitg1304/robotics-agent-skills
tier: T4
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

> **Issue filing:** File `ISS-NNN.md` in `issues/` as issues arise during the session — do not wait until the end. Reference each in `ISS-NNN.md` (e.g., `→ ISS-001`).

---

## Happy-Path Protocol

- [x] **Step 1 — Confirm tier**

  Confirm the tier you identified during pre-session setup. Update if your assessment changes after inspecting the repo or the output of `create-skillet`.

  Tier: T4
  Notes: 10 SKILL.md files at `skills/<topic>/SKILL.md`, each with no companion files. No root `package.json`. Root has `install.sh` and `evals/` only. Confirmed T4.

- [x] **Step 2 — Bootstrap**

  Grade whether the test user was able to set up their environment using only the npm README for `create-skillet`.

  npm README: https://www.npmjs.com/package/create-skillet

  > **Guide note:** The test user does not know the name of the tool — discovering `create-skillet` is part of what Step 2 measures. If they found the npm page via direct search, that is a clean pass. If they arrived via the GitHub repo and used GitHub documentation to complete bootstrap, apply the soft-fail classification only for information they obtained exclusively from GitHub.

  Note any point where the test user consulted the GitHub README or required outside information to proceed.

  Outcome: 🟡 Soft fail — docs gap. Same structural issue as T1–T3: the `create-skillet-version: 0.2.1` pre-filled in the LOG header revealed the tool name before the test user could discover it independently. Test user ran `npx create-skillet@0.2.1` directly without searching.

- [x] **Step 3 — Run create-skillet**

  Grade how the test user navigated the wizard. Note the prompts shown, the defaults presented, and whether the defaults were sensible.

  Outcome: 🟠 Soft fail — UX issue. Multi-skill detection worked correctly: wizard detected "SKILL.md: found in 10 locations" at startup and automatically entered multi-skill mode, prompting "Package all skills into one npm package? (Y/n)". This is a significant improvement over v0.1.3. Wizard completed successfully in a single pass. However, two UX issues:
  - No defaults for Description or Author (no git user, no existing package.json) — no "(required)" label or guidance for the user
  - Package contents preview showed only "SKILL.md" — does not enumerate all 10 skills or indicate the full scope of what was packaged → ISS-001 (downstream: "files" bug makes this preview misleading)

  Prompt sequence: Proceed → name → version → description → author → repo URL → license → "Package all skills? (Y/n)" → confirm.

- [x] **Step 4 — Verify output**

  Observe what the test user does to verify the output. Note what they look for and whether the tool's own output gave them sufficient guidance — without prompting them.

  Notes: 🔶 Mid fail — functional issue. Test user examined package.json and found `"skillet": {"skills": "skills"}` — correct. But also found `"files": ["bin", "skills/docker-ros2-development/"]` — only 1 of 10 skills listed. Confirmed via `npm pack --dry-run` that only `skills/docker-ros2-development/SKILL.md` would be included in a published package. The other 9 skills are absent from the npm publish manifest. → ISS-001. Bin script clean: `await run({ pkg })` (ISS-003 from prior runs fixed in v0.2.1).

- [x] **Step 5 — Install skill**

  Grade the install step. Note whether the test user found the install path from the available documentation alone.

  Available documentation for this step includes the npm README at https://www.npmjs.com/package/@skillet-cli/core

  Notes: 🟠 Soft fail — UX issue. `npx . install` ran and installed all 10 skills successfully (despite the "files" bug, the local install reads from the filesystem rather than the npm tarball). However, the installer presented a separate wizard (scope + target prompts) for each of the 10 skills — requiring 20 prompt interactions total. → ISS-002. No consolidated "install all" flow for multi-skill packages.

- [x] **Step 6 — Verify skill placement**

  Confirm skill files landed in the correct relative path **inside the container**. This step verifies structural correctness — that the packaging and install mechanics worked — not that the skill is active in a real agent environment.

  | Environment | Expected skill install path |
  |---|---|
  | Claude Code | `~/.claude/skills/<skill-name>/` |
  | GitHub Copilot CLI | `~/.config/gh-copilot/skills/<skill-name>/` |
  | Custom agent | Defined by the agent's configuration |

  Actual path observed: All 10 skills installed at `/root/.claude/skills/<skill-name>/`, each with SKILL.md and `.skill-manifest.json`. Skill names derived from SKILL.md `name:` field (not directory name), e.g. `ros1/` → `ros1-development`, `ros2/` → `ros2-development`.
  Match: yes ✅ (all 10 skills at correct paths)

---

## Soft-Fail Log
<!-- Summarize steps that didn't pass cleanly. Per-step Outcome fields above hold the full notes; this table is a quick-scan overview. -->

| Step | Symbol | Notes |
|------|--------|-------|
| Step 2 | 🟡 | Tool name from pre-filled LOG header |
| Step 3 | 🟠 | Package contents preview misleading (only "SKILL.md"); no "(required)" label on empty prompts |
| Step 4 | 🔶 | "files" in package.json only lists one skill — npm publish would drop 9 of 10 skills (ISS-001) |
| Step 5 | 🟠 | 10 separate wizard sessions for 10 skills — re-prompted for scope and target each time (ISS-002) |

---

## Issues Filed

- [ISS-001](./issues/ISS-001.md) — "files" in generated package.json only lists one skill; 9 of 10 skills would be missing from npm publish
- [ISS-002](./issues/ISS-002.md) — Multi-skill install presents separate scope+target wizard for each skill (10 prompts for 10 skills)

---

## UX Quality Observations

- **Multi-skill detection works** in v0.2.1: the wizard correctly identified 10 SKILL.md locations, showed them all, and asked "Package all skills into one npm package?" This is a major improvement over v0.1.3 which silently packaged only one.
- **ISS-001 is critical**: despite multi-skill mode working during packaging, the generated `"files"` field only includes the first skill directory. Any user who publishes to npm and then installs from npm (rather than local) will get only 1 of 10 skills. The local `npx . install` works because it reads from the filesystem, masking the bug.
- **Package contents preview is misleading** for multi-skill repos: "SKILL.md" appears as the only listed file. A user with 10 skills expects to see all 10 listed. The preview should enumerate skills/ directories or skill names.
- **10 separate install wizards is exhausting**: the multi-skill install experience requires re-answering scope and target for every skill. A consolidated install flow ("Install all 10 skills to Claude Code (user scope)?") would greatly improve T4+ UX.
- **ISS-003 (bin/cli.js hardcoded path) is fixed in v0.2.1**: the generated bin/cli.js now reads from pkg cleanly (`await run({ pkg })`), with no hardcoded skill path.
- **Skill names from SKILL.md, not directories**: `ros1/` installs as `ros1-development` because the SKILL.md `name:` field is `ros1-development`. This is consistent and expected, but could surprise users whose directory names differ from skill names.
- **Empty-field crash fixed**: no empty-field crash occurred. The description field was left without a default (no git user or existing package.json) but the wizard accepted the typed value cleanly.
