## Why

The candidate repos in `test-manual/TEST-MATRIX.md` were seeded without verifying actual repo structure — resulting in at least one confirmed misclassification (`netresearch/agent-rules-skill` listed as T1, actually T3) and four uninspected entries. All five repos must be inspected and corrected, and any vacated tier slots must be filled with verified replacements, so that every scheduled test run targets the correct complexity tier.

## What Changes

- Correct `netresearch/agent-rules-skill` from T1 → T3 (has deeply nested assets/, references/, scripts/ alongside a single SKILL.md)
- Correct `netresearch/skill-repo-skill` from T2 → T3 (has three nested subdirectories: references/, scripts/, templates/ — not flat)
- Correct `harness/harness-skills` from T3 → T5 (54 SKILL.md files with per-skill and root-level nested resources)
- Correct `addyosmani/agent-skills` from T4 → T5 (24 SKILL.md files plus root-level hooks/, scripts/, agents/, commands/ directories)
- Confirm `obra/superpowers` at T5 (no change needed)
- Add new T1 candidate: `Hao0321/claude-skill-code-cleanup` (single SKILL.md, zero companion files — confirmed T1)
- Add new T2 candidate: `jzOcb/writing-style-skill` (root SKILL.md plus flat scripts/ with two Python files — confirmed T2)
- Add new T4 candidate: `arpitg1304/robotics-agent-skills` (10 SKILL.md files, no per-skill companions, minimal root files — confirmed T4)

## Capabilities

### New Capabilities

None. No new capabilities are introduced — this is a content correction to an existing data file.

### Modified Capabilities

- `manual-test-harness`: The `TEST-MATRIX.md` catalog requirement states it must be "seeded with at least five repos spanning tiers T1–T5." After corrections the catalog will have 8 verified rows covering all five tiers. A delta spec has been added that formalises the new requirement that every catalog row must have a tier classification confirmed by direct inspection of the repo's file tree — not assigned by assumption. Two scenarios capture this: one asserting every row has a confirmed tier, and one asserting all five tiers T1–T5 are covered by at least one verified candidate.

## Impact

- Only `test-manual/TEST-MATRIX.md` is modified — no code, no scripts, no templates, no interfaces
- No changes to `test-manual/README.md`, `openspec/specs/manual-test-harness/spec.md`, or any harness infrastructure
- The actual test runs are out of scope
