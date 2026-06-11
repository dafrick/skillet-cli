## 1. Define Acceptance Criteria

- [ ] 1.1 Confirm that the final TEST-MATRIX.md Candidate Repos table has exactly 8 rows: Hao0321/claude-skill-code-cleanup (T1), jzOcb/writing-style-skill (T2), netresearch/agent-rules-skill (T3), netresearch/skill-repo-skill (T3), arpitg1304/robotics-agent-skills (T4), harness/harness-skills (T5), addyosmani/agent-skills (T5), obra/superpowers (T5) — a distribution of T1×1, T2×1, T3×2, T4×1, T5×3.
- [ ] 1.2 Verify that no tier T1–T5 is absent from the table (each tier appears at least once)
- [ ] 1.3 Verify that the Test Run Log table is unchanged (all dashes, no test data to modify)

## 2. Correct Existing Rows

- [ ] 2.1 Update the `netresearch/agent-rules-skill` row: change Tier from T1 to T3, update Complexity Notes to "Single skill + deeply nested assets/, references/, scripts/ (22+ scripts, lib/ subdir)"
- [ ] 2.2 Update the `netresearch/skill-repo-skill` row: change Tier from T2 to T3, update Complexity Notes to "Single skill + nested references/ (11 docs), scripts/ (4 scripts), templates/ (11 files)"
- [ ] 2.3 Update the `harness/harness-skills` row: change Tier from T3 to T5, update Complexity Notes to "54 SKILL.md files; per-skill references/; root-level scripts/, templates/, sboms/, examples/"
- [ ] 2.4 Update the `addyosmani/agent-skills` row: change Tier from T4 to T5, update Complexity Notes to "24 SKILL.md files; root-level hooks/, scripts/, agents/, commands/, references/"
- [ ] 2.5 Confirm the `obra/superpowers` row stays T5 — no change needed; optionally sharpen Complexity Notes if desired

## 3. Add Replacement Rows

- [ ] 3.1 Add a new T1 row: Tier=T1, Repo=`Hao0321/claude-skill-code-cleanup`, Complexity Notes="Single SKILL.md at code-cleanup-helper/SKILL.md, zero companion files", Status=Untested
- [ ] 3.2 Add a new T2 row: Tier=T2, Repo=`jzOcb/writing-style-skill`, Complexity Notes="Root SKILL.md + flat scripts/ with two Python files, no nested subdirs", Status=Untested
- [ ] 3.3 Add a new T4 row: Tier=T4, Repo=`arpitg1304/robotics-agent-skills`, Complexity Notes="10 SKILL.md files under skills/<topic>/, no per-skill companions; root has install.sh, evals/ only", Status=Untested

## 4. Verify Final State

- [ ] 4.1 Read the updated TEST-MATRIX.md and confirm: all 8 rows present, tiers T1–T5 all covered, no original misclassified tier remains
- [ ] 4.2 Confirm no other file was modified (scripts, templates, README, specs are all unchanged)
