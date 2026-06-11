## Context

`test-manual/TEST-MATRIX.md` was seeded with five candidate repos at the time the test harness was created. The repos were chosen to span tiers T1–T5, but their actual structure was not inspected before they were entered. When the first test run was attempted against `netresearch/agent-rules-skill` (listed T1), it was found to have deeply nested resources and scripts — making it T3. A full inspection of all five entries, plus a GitHub search for verified replacements for vacated slots, has been completed prior to this change.

## Goals / Non-Goals

**Goals:**
- Replace all five original rows with rows whose tier classification is confirmed against actual repo structure
- Ensure all five tiers (T1–T5) have at least one verified candidate after corrections
- Keep two T3 rows and three T5 rows to provide light/heavy coverage variants within those tiers

**Non-Goals:**
- Modifying any harness script, template, Makefile, README, or spec file
- Running actual tests against the corrected or new candidate repos
- Changing the tier definitions in `test-manual/README.md`

## Decisions

### Decision: Keep both corrected T3 repos rather than removing one

`netresearch/agent-rules-skill` and `netresearch/skill-repo-skill` both land at T3 after inspection. Keeping both provides a lighter-T3 variant (skill-repo-skill: ~26 companion files) and a heavier-T3 variant (agent-rules-skill: 22+ scripts, deeply nested references, evals). Having two rows in the same tier allows a guide to pick the complexity level that best exercises an edge case being investigated.

**Alternative considered:** Remove one T3 row to keep exactly one candidate per tier. Rejected — the matrix has no one-per-tier constraint, and having variants is explicitly more useful for targeted regression testing.

### Decision: Use T1/T2/T4 replacement repos from GitHub search rather than trying to re-classify other existing repos

The three vacated slots (T1, T2, T4) are filled by freshly found repos verified via the GitHub API to have the exact structure required. Re-using already-present repos (all of which are T3+ after correction) would leave lower tiers empty.

### Decision: No spec changes required

The existing `manual-test-harness` spec requires "at least five repos spanning tiers T1–T5." After this change the catalog has 8 verified rows covering all five tiers. The requirement continues to be satisfied — no modification to the spec is needed.

## Risks / Trade-offs

- **Replacement repos may be deleted or restructured later** → Mitigation: The README already instructs guides to re-inspect the repo before each run and correct the matrix entry if the tier has changed. This is the standing mitigation for catalog staleness.
- **Hao0321/claude-skill-code-cleanup is a small, low-activity repo** → Acceptable for T1 testing: T1 only requires a single SKILL.md with no companions, and this is confirmed. Staleness risk is low because there is nothing to change.

## Migration Plan

1. Update the five existing rows in `TEST-MATRIX.md` with corrected tiers and updated complexity notes
2. Append three new rows (T1, T2, T4 replacements)
3. Verify: all five tiers covered; no row references a misclassified tier

No rollback strategy needed — this is a documentation-only change committed to version control.
