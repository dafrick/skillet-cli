# Session Log: agent-rules-skill

<!-- Guide pre-fills this block before handing LOG.md to the test user. Test user fills in `tester:` only. -->
```
repo: netresearch/agent-rules-skill
tier: T3
env: Claude Code
create-skillet-version: 0.1.3
date: 2026-06-15
tester:
docker-image: ubuntu:24.04
```

---

**This is your running log.** Record what you do and observe as you work, prefixed with `HH:MM`. This file is append-only — never edit or delete prior entries. If you need to correct something, add a new entry noting the correction.

---

<!-- Format examples:

14:32 Ran `npx create-skillet`. Wizard launched. Selected all defaults.
14:35 Output directory present. Inspected contents — structure looked reasonable.
14:38 npm pack failed — "missing main field" error. Tried running from parent directory, same result. → ISS-001
14:42 Added "main" field manually to package.json as a workaround. Continued. → ISS-001 (workaround noted)
14:47 Skill files appeared at ~/.claude/skills/my-skill/. Install seemed to succeed.
14:50 Could not determine where skills should land from the available docs. Stuck on Task 2.

-->
<!-- Append entries below. -->
10:00 Started session. Explored /repo/netresearch-agent-rules-skill — repo contains skills/agent-rules/ with SKILL.md, assets/, references/, scripts/ subdirectories. Also has top-level assets/, scripts/, docs/, evals/ directories. The skill is under skills/agent-rules/ with a SKILL.md present.
10:01 Checked existing package.json at repo root — no skillet key present yet. Navigating to repo and running npx create-skillet@0.1.3.
10:02 Wizard launched. Detected package.json found, SKILL.md not found at root (it lives at skills/agent-rules/SKILL.md). Accepted "Proceed with setup? Yes".
10:03 Wizard prompts: package name defaulted to @netresearch/agent-rules-skill (from existing package.json). Accepted. Version defaulted to 0.1.0. Accepted.
10:03 Description defaulted to "Netresearch AI skill for generating AGENTS.md, copilot-instructions.md, and other agent rule files." Accepted.
10:03 Author defaulted to "Netresearch DTT GmbH (https://www.netresearch.de/)". Accepted.
10:03 Repository URL defaulted to git+https://github.com/netresearch/agent-rules-skill. Accepted.
10:04 License defaulted to MIT. Accepted.
10:04 Skill content path defaulted to skills/agent-rules/ — wizard auto-detected the skill directory. Accepted.
10:04 Wizard showed summary and asked "Proceed? Yes". Accepted. npm install ran (~197s).
10:04 create-skillet completed successfully: "Your skill package is ready." Suggested next steps: npx . install / npm publish.
10:05 Inspected package.json after wizard: skillet.skillDir = "skills/agent-rules/", bin entry "@netresearch/agent-rules-skill" pointing to ./bin/cli.js. Correct.
10:05 Inspected bin/cli.js: hardcodes '../skills/agent-rules/' directly in URL — does NOT read from pkg.skillet.skillDir. → ISS-003 (bin/cli.js ignores skillet.skillDir).
10:06 Running npx . install from /repo/netresearch-agent-rules-skill.
10:07 npx . install launched. Selected scope: user (default). Selected target: Claude Code (already checked). Accepted.
10:07 Install completed: "1 target installed · 0.1s". Skill installed at /root/.claude/skills/agent-rules.
10:08 Verified /root/.claude/skills/agent-rules/ — contents: AGENTS.md, SKILL.md, checkpoints.yaml, references, CLAUDE.md, assets, evals, scripts. All expected files present.
10:08 No file-move prompt appeared during the wizard — skill was already inside skills/agent-rules/ subdirectory so no ISS-002 scenario triggered. ISS-002 not applicable here.
10:08 ISS-003 confirmed: bin/cli.js hardcodes '../skills/agent-rules/' directly rather than reading from pkg.skillet.skillDir. Install still succeeded because the hardcoded path was correct. Documented in issues/ISS-003.md.

## SUMMARY

### Task 1: Package the skills

Ran `npx create-skillet@0.1.3` from `/repo/netresearch-agent-rules-skill`. The wizard detected the existing package.json and auto-detected the skill at `skills/agent-rules/`. All prompts accepted defaults (package name: @netresearch/agent-rules-skill, version: 0.1.0, author: Netresearch DTT GmbH). The wizard ran `npm install @skillet-cli/core` (~197s), wrote `skillet.skillDir: "skills/agent-rules/"` into package.json, and generated `bin/cli.js`. Packaging completed successfully.

### Task 2: Install the skills

Ran `npx . install` from the packaged repo. Selected scope: user, target: Claude Code. Install succeeded — skill files landed at `/root/.claude/skills/agent-rules/` with all expected content (SKILL.md, scripts/, references/, assets/, etc.).

### Issues found

- ISS-003 (bin/cli.js ignores skillet.skillDir): The generated bin/cli.js hardcodes the skill path (`../skills/agent-rules/`) rather than reading from `pkg.skillet.skillDir`. Install succeeded here because the hardcoded path matched the actual skill location. Documented in issues/ISS-003.md. This is a known bug from prior runs; the workaround (manually rewriting bin/cli.js to use `pkg.skillet?.skillDir`) was not needed here since the hardcoded path was correct.
- ISS-002 (skillDir not updated after file-move): Not triggered — the wizard did not show a file-move prompt because the skill was already in a dedicated subdirectory. No ISS-002 scenario encountered.
