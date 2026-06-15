# Test Matrix

> **Before starting a run:** Consult this matrix to identify coverage gaps. Prioritize untested tiers and environments — the Status column and Test Run Log show where coverage is thin.
>
> **After completing a run:** Update the Status column with the date and brief outcome, e.g. `2026-06-06 pass` or `2026-06-06 fail — hard fail step 3`. The Test Run Log below is the authoritative record; the Status column is a quick-scan view.

## Candidate Repos

| Tier | Repo | Complexity Notes | Status |
|------|------|-----------------|--------|
| T1 | `Hao0321/claude-skill-code-cleanup` | Single SKILL.md at code-cleanup-helper/SKILL.md, zero companion files | 2026-06-14 mid fail — ISS-001 empty author crashes Seasoning; install pass |
| T2 | `jzOcb/writing-style-skill` | Root SKILL.md + flat scripts/ with two Python files, no nested subdirs | 2026-06-14 hard fail — ISS-002 skillDir not updated, ISS-003 bin/cli.js ignores it |
| T3 | `netresearch/agent-rules-skill` | Single skill + deeply nested assets/, references/, scripts/ (22+ scripts, lib/ subdir) | 2026-06-15 pass — ISS-003 latent (hardcoded path matched); all steps pass |
| T3 | `netresearch/skill-repo-skill` | Single skill + nested references/ (11 docs), scripts/ (4 scripts), templates/ (11 files) | 2026-06-15 pass — silent license/version transforms (UX); ISS-003 latent |
| T4 | `arpitg1304/robotics-agent-skills` | 10 SKILL.md files under skills/<topic>/, no per-skill companions; root has install.sh, evals/ only | Untested |
| T5 | `harness/harness-skills` | 54 SKILL.md files; per-skill references/; root-level scripts/, templates/, sboms/, examples/ | Untested |
| T5 | `addyosmani/agent-skills` | 24 SKILL.md files; root-level hooks/, scripts/, agents/, commands/, references/ | Untested |
| T5 | `obra/superpowers` | Multi-skill with scripts, templates, deep nesting | Untested |

## Test Run Log

| Date | Repo | Tier | Env | Outcome | Run Folder |
|------|------|------|-----|---------|------------|
| 2026-06-14 | Hao0321/claude-skill-code-cleanup | T1 | Claude Code | 🔶 Step 3 (ISS-001 empty author), ✅ Steps 4–6 | runs/2026-06-14-hao0321-claude-skill-code-cleanup/ |
| 2026-06-14 | jzOcb/writing-style-skill | T2 | Claude Code | 🔴 Step 5 (ISS-002 + ISS-003 — install broken without manual patches) | runs/2026-06-14-jzocb-writing-style-skill/ |
| 2026-06-15 | netresearch/agent-rules-skill | T3 | Claude Code | 🟡 Step 2 (tool name from header); ✅ Steps 3–6 — ISS-003 latent but did not block | runs/2026-06-15-netresearch-agent-rules-skill/ |
| 2026-06-15 | netresearch/skill-repo-skill | T3 | Claude Code | 🟡 Step 2; 🟠 Step 3 (silent license/version/private transforms); ✅ Steps 4–6 | runs/2026-06-15-netresearch-skill-repo-skill/ |
