# Test Matrix

> **Before starting a run:** Consult this matrix to identify coverage gaps. Prioritize untested tiers and environments — the Status column and Test Run Log show where coverage is thin.
>
> **After completing a run:** Update the Status column with the date and brief outcome, e.g. `2026-06-06 pass` or `2026-06-06 fail — hard fail step 3`. The Test Run Log below is the authoritative record; the Status column is a quick-scan view.

## Candidate Repos

| Tier | Repo | Complexity Notes | Status |
|------|------|-----------------|--------|
| T3 | `netresearch/agent-rules-skill` | Single skill + nested resources/scripts (scripts/, references/, assets/ all deeply nested) | 2026-06-07 mid fail — Step 3 crash (ISS-001), Steps 4–6 pass |
| T2 | `netresearch/skill-repo-skill` | Single skill + flat supporting files | Untested |
| T3 | `harness/harness-skills` | Single skill + nested resources/scripts | Untested |
| T4 | `addyosmani/agent-skills` | Multiple SKILL.md files in subdirs | Untested |
| T5 | `obra/superpowers` | Multi-skill with scripts, templates, deep nesting | Untested |

## Test Run Log

| Date | Repo | Tier | Env | Outcome | Run Folder |
|------|------|------|-----|---------|------------|
| 2026-06-07 | `netresearch/agent-rules-skill` | T3 | Claude Code | 🔶 Mid fail — ISS-001 (missing fonts in npm package); Steps 4–6 ✅ | `runs/2026-06-07-netresearch-agent-rules-skill` |
