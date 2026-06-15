# Test Matrix

> **Before starting a run:** Consult this matrix to identify coverage gaps. Prioritize untested tiers and environments — the Status column and Test Run Log show where coverage is thin.
>
> **After completing a run:** Update the Status column with the date and brief outcome, e.g. `2026-06-06 pass` or `2026-06-06 fail — hard fail step 3`. The Test Run Log below is the authoritative record; the Status column is a quick-scan view.

## Candidate Repos

| Tier | Repo | Complexity Notes | Status |
|------|------|-----------------|--------|
| T1 | `Hao0321/claude-skill-code-cleanup` | Single SKILL.md at code-cleanup-helper/SKILL.md, zero companion files | 2026-06-15 mid fail — ISS-001 empty author/desc crashes wizard; install pass |
| T2 | `jzOcb/writing-style-skill` | Root SKILL.md + flat scripts/ with two Python files, no nested subdirs | Untested |
| T3 | `netresearch/agent-rules-skill` | Single skill + deeply nested assets/, references/, scripts/ (22+ scripts, lib/ subdir) | Untested |
| T3 | `netresearch/skill-repo-skill` | Single skill + nested references/ (11 docs), scripts/ (4 scripts), templates/ (11 files) | Untested |
| T4 | `arpitg1304/robotics-agent-skills` | 10 SKILL.md files under skills/<topic>/, no per-skill companions; root has install.sh, evals/ only | Untested |
| T5 | `harness/harness-skills` | 54 SKILL.md files; per-skill references/; root-level scripts/, templates/, sboms/, examples/ | Untested |
| T5 | `addyosmani/agent-skills` | 24 SKILL.md files; root-level hooks/, scripts/, agents/, commands/, references/ | Untested |
| T5 | `obra/superpowers` | Multi-skill with scripts, templates, deep nesting | Untested |

## Test Run Log

| Date | Repo | Tier | Env | Outcome | Run Folder |
|------|------|------|-----|---------|------------|
| 2026-06-15 | Hao0321/claude-skill-code-cleanup | T1 | Claude Code | 🔶 Step 3 (ISS-001 empty author/desc crash), ✅ Steps 4–6 | runs/2026-06-15-hao0321-claude-skill-code-cleanup/ |
