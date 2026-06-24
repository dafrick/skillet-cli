# Test Run: writing-style-skill

```
repo: jzOcb/writing-style-skill
tier: T2
env: Claude Code
create-skillet-version: 0.1.3
date: 2026-06-14
tester: claude-sonnet-4-6 (sub-agent)
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

## Happy-Path Protocol

- [x] **Step 1 — Confirm tier**

  Tier: T2
  Notes: Root SKILL.md + flat `scripts/` directory (observe.py, improve.py). Confirmed T2.

- [x] **Step 2 — Bootstrap**

  Outcome: 🟡 Soft fail — docs gap (agent used training-data knowledge of tool name; discovery not independently tested)

- [x] **Step 3 — Run create-skillet**

  Wizard launched, detected SKILL.md. File-move step shown — tester selected SKILL.md and scripts/. Files moved to `skill/`. Wizard completed successfully (311s).

  Wizard defaults: package name `jzocb-writing-style-skill` (sensible), skill content path `"./"` (correct for this repo's layout).

  Outcome: ✅ Wizard itself completed without error (with non-empty author applied from ISS-001 knowledge)

- [x] **Step 4 — Verify output**

  Tester immediately attempted `npx . install` and discovered the install broken. Self-diagnosed: `package.json skillet.skillDir` still `"./"` after files moved to `skill/`.

  Notes: The post-wizard output said "Your skill package is ready" with no hint about skillDir needing update. No UX signal that files were moved to a subdirectory that requires a config update. → ISS-002

- [x] **Step 5 — Install skill**

  First attempt: 🔴 Hard fail — `SKILL.md not found` error.
  
  Manual fix 1: `npm pkg set skillet.skillDir=skill/` → still failed.
  Manual fix 2: Patched `bin/cli.js` to join pkgRoot with `pkg.skillet.skillDir` → install succeeded.

  Two manual code patches required before install worked. → ISS-002, ISS-003

  Outcome: 🔴 Hard fail (required two manual patches — not a user-serviceable workaround)

- [x] **Step 6 — Verify skill placement**

  | Environment | Expected skill install path |
  |---|---|
  | Claude Code | `~/.claude/skills/<skill-name>/` |

  Actual path observed: `/root/.claude/skills/writing-style-skill/` (SKILL.md + scripts/)
  Match: yes ✅ (after fixes)

---

## Soft-Fail Log

| Step | Symbol | Notes |
|------|--------|-------|
| 2 | 🟡 | Agent used training-data knowledge of tool name |
| 5 | 🔴 | `skillet.skillDir` not updated after file-move (ISS-002) + `bin/cli.js` ignores it (ISS-003); required manual code patches |

---

## Issues Filed

- [ISS-002](./issues/ISS-002.md) — Wizard does not update `skillet.skillDir` after moving files to `skill/`
- [ISS-003](./issues/ISS-003.md) — `bin/cli.js` ignores `skillet.skillDir`, uses package root as skill directory

---

## UX Quality Observations

- **Post-wizard output:** "Your skill package is ready" with `npx . install` hint gives no indication that `skillet.skillDir` needs updating when files were moved. A T2 user following the happy path would hit a hard error with no guidance.
- **File-move step:** The file-move UX is functional but the downstream config consequence is silent — the wizard should either update `skillet.skillDir` automatically or warn the user.
- **Install error message:** `SKILL.md not found in <path>` is cryptic — doesn't tell the user what value was used or what to change.
